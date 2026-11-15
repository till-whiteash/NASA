import * as THREE from 'three';

// The circuit lab at the workbench: real wiring on a bench, solved like a real circuit (nodal analysis), so whatever
// the player wires behaves the way it would. Three lessons:
//   series   - four 12 V Li-ion cells chained + to - make 48 V (voltages add, the same current flows through each)
//   parallel - two 24 V strings side by side: same voltage, twice the amp-hours, half the current each
//   ground   - a frayed wire touches the metal frame: without grounding the frame is "live"; with the frame and the
//              battery - bonded to the ground rod, the fault current rushes to ground and the fuse cuts the power
// Moving dots show current (conventional current: out of +, through the load, back into -; speed grows with amps);
// terminals glow by their voltage (blue 0 V to orange 48 V). Click a terminal, then another, to run a wire;
// click a wire to remove it.
const CELL_V = 12, CELL_R = .01, CELL_AH = 20, LAMP_R = 2.3, WIRE_R = .004, FUSE_A = 60, BODY_R = 1000, FAULT_R = .05;
const CELL_X = [-1.65, -.75, .15, 1.05], CELL_Z = .55, LAMP = { x: -.35, z: -.7 }, FRAME = { x: 1.9, z: -.7 }, ROD = { x: 2.05, z: .55 };
const LESSONS = {
  series: {
    title: 'Lesson 1 · Series: voltages add up',
    teach: [
      '<b>Voltage</b> is the push that drives electricity, like water pressure in a pipe. <b>Current</b> (amps) is how much flows each second.',
      'Each lithium-ion cell here gives <b>12 V</b>. Join them <b>in series</b> - the <b>+</b> of one cell to the <b>−</b> of the next - and their pushes add up: 4 × 12 V = <b>48 V</b>.',
      'In series there is only <b>one path</b>, so the same current flows through every cell, like water through one long pipe.',
      'Solar panels do the same: about 60 small 0.5 V cells in series make one 30 V panel.',
    ],
    task: 'Chain all four cells + to −, then connect the free <b>+</b> end to the lamp\'s <b>+</b> and the free <b>−</b> end to the lamp\'s <b>−</b>.',
    done: 'All four cells push together: 48 V, and one current flows round the whole loop. Watch the dots: out of +, through the lamp, back into −.',
  },
  parallel: {
    title: 'Lesson 2 · Parallel: more capacity, same voltage',
    teach: [
      'In <b>parallel</b>, every <b>+</b> joins every <b>+</b> and every <b>−</b> joins every <b>−</b>. The voltage stays the same, but there are <b>several paths</b>, so the cells share the current.',
      'Capacity (amp-hours, Ah) adds up in parallel: two 20 Ah strings give <b>40 Ah</b>, so the battery runs longer.',
      'Real battery packs mix both: <b>series</b> to reach the voltage, <b>parallel</b> to reach the capacity. A "2s2p" pack is 2 in series, 2 in parallel.',
      'Energy (watt-hours) is volts × amp-hours. It\'s the same four cells either way, so it\'s the same energy, spent more slowly.',
    ],
    task: 'Build <b>two strings of two cells</b> in series (24 V each). Then join the two strings in parallel (+ to +, − to −) and power the lamp.',
    done: 'A 2s2p pack: 24 V and 40 Ah. Each string carries half the lamp\'s current. The lamp uses a quarter of the power, so the same energy lasts four times longer.',
  },
  ground: {
    title: 'Lesson 3 · Grounding: a safe path for faults',
    teach: [
      'Sometimes insulation wears through and a live wire touches the metal <b>frame</b> of a machine. The frame then sits at 48 V, waiting for a path.',
      'If an astronaut touches that frame while standing on the ground, <b>the path is them</b>. As little as 30 mA through a body is dangerous.',
      'The battery\'s − is already <b>bonded</b> to a <b>ground rod</b> driven into the soil (the green-yellow wire). A <b>ground wire</b> from the frame to that rod gives a fault an easy road back to the battery: a huge current rushes through it, and the <b>fuse blows</b> and cuts the power in a split second.',
      'On Mars, grounding also bleeds away the <b>static charge</b> that blowing dust builds up on equipment. That protects electronics, and you.',
    ],
    task: '1. Press <b>⚡ Cause a fault</b> and see what happens without grounding. 2. Wire the <b>frame</b> to the <b>ground rod</b>. 3. Cause the fault again and follow the current to ground.',
    done: 'The fault current went straight to ground and the 60 A fuse blew. The frame stayed at 0 V, safe to touch. That is why every power system on the outpost is grounded.',
  },
};
const ORDER = ['series', 'parallel', 'ground'];

function label(text, color = '#fff', bg = 'rgba(0,0,0,0)', w = 128, h = 64, size = 40) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const draw = (t, col = color) => { g.clearRect(0, 0, w, h); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.fillStyle = col; g.font = `bold ${size}px Poppins, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, w / 2, h / 2 + 2); };
  draw(text); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.renderOrder = 5; sp.userData.set = (t, col) => { draw(t, col); tex.needsUpdate = true; };
  return sp;
}

// ---- the solver: nodal analysis with cells as Norton sources, wires and loads as resistors. Node 'G' (ground rod) is 0 V.
function solve(parts) {
  const ids = [...new Set(parts.flatMap(p => [p.a, p.b]))].filter(n => n !== 'G'), idx = new Map(ids.map((n, i) => [n, i])), N = ids.length;
  const A = Array.from({ length: N }, () => new Float64Array(N + 1));
  const g = (a, b, s) => { const i = idx.get(a), j = idx.get(b); if (i != null) A[i][i] += s; if (j != null) A[j][j] += s; if (i != null && j != null) { A[i][j] -= s; A[j][i] -= s; } };
  for (const n of ids) A[idx.get(n)][idx.get(n)] += 1e-9;                 // a whisper of leakage keeps floating parts solvable
  for (const p of parts) {
    if (p.kind === 'cell') { g(p.a, p.b, 1 / CELL_R); const i = idx.get(p.a), j = idx.get(p.b), I = p.V / CELL_R; if (j != null) A[j][N] += I; if (i != null) A[i][N] -= I; }
    else g(p.a, p.b, 1 / p.R);
  }
  for (let c = 0; c < N; c++) {                                            // Gaussian elimination
    let piv = c; for (let r = c + 1; r < N; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < N; r++) { if (r === c || !A[r][c]) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= N; k++) A[r][k] -= f * A[c][k]; }
  }
  const v = n => n === 'G' ? 0 : (idx.has(n) ? A[idx.get(n)][N] / A[idx.get(n)][idx.get(n)] : 0);
  const current = p => p.kind === 'cell' ? (p.V - (v(p.b) - v(p.a))) / CELL_R : (v(p.a) - v(p.b)) / p.R;   // cell: amps leaving its + terminal
  return { v, current };
}

export function openCircuitLab({ start = 'series', done = {}, onStep } = {}) {
  return new Promise(resolve => {
    const el = document.createElement('section'); el.className = 'circuit-lab'; el.setAttribute('aria-label', 'Circuit lab');
    el.innerHTML = `<canvas></canvas>
      <aside class="cl-panel"><p class="cl-kicker">Circuit lab · workbench</p><h2 class="cl-h"></h2><div class="cl-teach"></div>
        <p class="cl-task"></p><p class="cl-feedback" aria-live="polite"></p>
        <div class="cl-actions"><button type="button" class="cl-fault" hidden>⚡ Cause a fault</button><button type="button" class="cl-reset">Clear wires</button><button type="button" class="cl-next" hidden>Next lesson ›</button></div></aside>
      <div class="cl-meters"><div><small>Lamp voltage</small><b data-m="v">0 V</b></div><div><small>Current</small><b data-m="i">0 A</b></div><div><small>Power</small><b data-m="p">0 W</b></div><div><small>Pack</small><b data-m="e">-</b></div><div class="cl-body" hidden><small>If an astronaut touched the frame</small><b data-m="body">0 mA</b></div></div>
      <div class="cl-legend"><span><i class="lg-flow"></i>current (out of +, back into −)</span><span><i class="lg-v0"></i>0 V</span><span><i class="lg-v48"></i>48 V</span></div>
      <button type="button" class="cl-close">Save &amp; leave the lab</button>`;
    document.body.append(el);
    const $ = s => el.querySelector(s), canvas = $('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b1016');
    scene.add(new THREE.HemisphereLight('#dfe8ff', '#20180f', 1.1));
    const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(-2, 6, 4); scene.add(key);
    const cam = new THREE.PerspectiveCamera(38, 1, .05, 50); cam.position.set(.15, 4.6, 3.6); cam.lookAt(.15, 0, -.05);
    const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .5, metalness: o.m ?? 0, emissive: o.e ?? '#000', emissiveIntensity: o.ei ?? 1 });

    // ---- the bench
    const boardTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#16202a'; g.fillRect(0, 0, 512, 512); g.strokeStyle = '#223140'; g.lineWidth = 2; for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const board = new THREE.Mesh(new THREE.BoxGeometry(5.4, .08, 2.8), new THREE.MeshStandardMaterial({ map: boardTex, roughness: .8 })); board.position.y = -.04; scene.add(board);
    const terms = new Map();                                       // id -> {mesh, glow, label, pos}
    const pickables = [];
    const terminal = (id, x, y, z, pole, group) => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .09, 20), M(pole === '+' ? '#c8231c' : pole === 'g' ? '#3a9a3a' : '#141414', { r: .45 }));
      cap.position.set(x, y + .045, z); group.add(cap);
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .06, 10), M('#d4a54a', { r: .3, m: 1 })); stud.position.y = .07; cap.add(stud);
      const glow = new THREE.Mesh(new THREE.TorusGeometry(.1, .018, 8, 24), new THREE.MeshBasicMaterial({ color: '#3b82f6' })); glow.rotation.x = Math.PI / 2; glow.position.y = -.04; cap.add(glow);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); cap.add(hit); hit.userData.term = id; pickables.push(hit);
      const vl = label('', '#dfe7ef', null, 128, 48, 30); vl.scale.set(.32, .12, 1); vl.position.set(x, y + .32, z); group.add(vl);
      terms.set(id, { cap, glow, vl, pole, top: () => cap.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .09, 0)) });
    };
    const cells = CELL_X.map((x, i) => {
      const g = new THREE.Group(); scene.add(g);
      const body = new THREE.Mesh(new THREE.BoxGeometry(.62, .24, .34), M('#2a3442', { r: .45 })); body.position.set(x, .12, CELL_Z); g.add(body);
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(.5, .245, .345), M('#2f6fd6', { r: .5 })); wrap.position.set(x, .12, CELL_Z); g.add(wrap);
      const t = label(`12 V · 20 Ah`, '#fff', null, 256, 64, 30); t.scale.set(.55, .14, 1); t.position.set(x, .3, CELL_Z + .26); g.add(t);
      const pm = label('+', '#ff5a4a', null, 64, 64, 54), mm = label('−', '#f2f2f2', null, 64, 64, 54);
      pm.scale.set(.13, .13, 1); mm.scale.set(.13, .13, 1); pm.position.set(x + .21, .3, CELL_Z - .12); mm.position.set(x - .21, .3, CELL_Z - .12); g.add(pm, mm);
      terminal(`c${i}n`, x - .21, .24, CELL_Z, '-', g); terminal(`c${i}p`, x + .21, .24, CELL_Z, '+', g);
      return g;
    });
    // the lamp: a habitat light on a board (2.3 ohm: 1 kW at 48 V)
    const lampG = new THREE.Group(); scene.add(lampG);
    const lampBase = new THREE.Mesh(new THREE.BoxGeometry(.7, .12, .36), M('#3a4048')); lampBase.position.set(LAMP.x, .06, LAMP.z); lampG.add(lampBase);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: .2, transparent: true, opacity: .9 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 16), bulbMat); bulb.position.set(LAMP.x, .34, LAMP.z); lampG.add(bulb);
    const bulbLight = new THREE.PointLight('#ffcf7a', 0, 4, 2); bulbLight.position.copy(bulb.position); lampG.add(bulbLight);
    const lt = label('Habitat lamp', '#dfe7ef', null, 256, 48, 28); lt.scale.set(.6, .11, 1); lt.position.set(LAMP.x, .62, LAMP.z); lampG.add(lt);
    terminal('Lp', LAMP.x - .26, .12, LAMP.z, '+', lampG); terminal('Ln', LAMP.x + .26, .12, LAMP.z, '-', lampG);
    // ground lesson: the equipment frame and the ground rod
    const gndG = new THREE.Group(); scene.add(gndG);
    const frameMat = M('#8d969c', { r: .35, m: .8 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(.7, .4, .5), frameMat); frame.position.set(FRAME.x, .2, FRAME.z); gndG.add(frame);
    const ft = label('Metal frame', '#dfe7ef', null, 256, 48, 28); ft.scale.set(.6, .11, 1); ft.position.set(FRAME.x, .66, FRAME.z); gndG.add(ft);
    terminal('F', FRAME.x - .2, .4, FRAME.z + .1, 'g', gndG);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5, 12), M('#b07a3a', { r: .3, m: .9 })); rod.position.set(ROD.x, .2, ROD.z); gndG.add(rod);
    const gsym = label('⏚ Ground rod', '#9be59b', null, 256, 48, 28); gsym.scale.set(.62, .11, 1); gsym.position.set(ROD.x, .62, ROD.z); gndG.add(gsym);
    terminal('G', ROD.x, .44, ROD.z, 'g', gndG);
    const fray = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(LAMP.x - .26, .2, LAMP.z), new THREE.Vector3(.7, .5, -.95), new THREE.Vector3(FRAME.x - .3, .3, FRAME.z)]), 30, .018, 6), M('#c8231c', { e: '#ff3b2b', ei: 1.5 }));
    fray.visible = false; gndG.add(fray);
    const spark = new THREE.PointLight('#ffd27a', 0, 2, 2); spark.position.set(FRAME.x - .3, .35, FRAME.z); gndG.add(spark);

    // ---- wires
    let wires = [], sel = null, lessonKey = start, solved = null, fault = false, fuseBlown = false, stage = 0, lastShort = 0;
    const wireMeshes = new Map(), flows = [];
    const dotGeo = new THREE.SphereGeometry(.022, 8, 6), dotMat = new THREE.MeshBasicMaterial({ color: '#7ff0ff' });
    const curveFor = (a, b) => { const p = terms.get(a).top(), q = terms.get(b).top(), d = p.distanceTo(q), m = p.clone().lerp(q, .5); m.y += .18 + d * .12;
      return new THREE.CatmullRomCurve3([p, p.clone().lerp(m, .5).setY(m.y * .85), m, q.clone().lerp(m, .5).setY(m.y * .85), q]); };
    const wireColour = (a, b) => [a, b].some(n => n === 'G' || n === 'F') ? '#c9c234' : [a, b].some(n => terms.get(n).pole === '+') && ![a, b].some(n => terms.get(n).pole === '-') ? '#c8231c' : [a, b].every(n => terms.get(n).pole === '+') ? '#c8231c' : '#1a1a1a';
    const addWireMesh = w => {
      const curve = curveFor(w.a, w.b), mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .026, 8), M(wireColour(w.a, w.b), { r: .55 }));
      mesh.userData.wire = w; scene.add(mesh); pickables.push(mesh); wireMeshes.set(w, { mesh, curve });
      const dots = new THREE.InstancedMesh(dotGeo, dotMat, 10); dots.visible = false; scene.add(dots); flows.push({ w, curve, dots, t: 0, I: 0 });
    };
    const clearWires = () => { for (const [w, { mesh }] of wireMeshes) { scene.remove(mesh); mesh.geometry.dispose(); pickables.splice(pickables.indexOf(mesh), 1); } wireMeshes.clear();
      for (const f of flows) { scene.remove(f.dots); f.dots.dispose(); } flows.length = 0; wires = []; };
    const connect = (a, b, fixed = false) => {
      if (a === b || wires.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return;
      const w = { a, b, fixed }; wires.push(w); addWireMesh(w); evaluate(w);
    };
    const removeWire = w => { const m = wireMeshes.get(w); if (!m || w.fixed) return; scene.remove(m.mesh); m.mesh.geometry.dispose(); pickables.splice(pickables.indexOf(m.mesh), 1); wireMeshes.delete(w);
      const fi = flows.findIndex(f => f.w === w); if (fi >= 0) { scene.remove(flows[fi].dots); flows[fi].dots.dispose(); flows.splice(fi, 1); } wires = wires.filter(x => x !== w); evaluate(); };

    // ---- the circuit
    const circuit = () => {
      const parts = [];
      if (!fuseBlown) CELL_X.forEach((_, i) => parts.push({ kind: 'cell', a: `c${i}n`, b: `c${i}p`, V: CELL_V, id: i }));
      parts.push({ kind: 'load', a: 'Lp', b: 'Ln', R: LAMP_R, id: 'lamp' });
      for (const w of wires) parts.push({ kind: 'wire', a: w.a, b: w.b, R: WIRE_R, w });
      if (lessonKey === 'ground') { parts.push({ kind: 'load', a: 'F', b: 'G', R: BODY_R, id: 'body' }); if (fault) parts.push({ kind: 'load', a: 'Lp', b: 'F', R: FAULT_R, id: 'fault' }); }
      return parts;
    };
    const feedback = (html, kind = '') => { const f = $('.cl-feedback'); f.innerHTML = html; f.className = 'cl-feedback ' + kind; };
    const meters = () => {
      const s = solved, V = s ? s.v('Lp') - s.v('Ln') : 0, I = V / LAMP_R, P = V * I;
      const active = s ? s.cells.filter(c => Math.abs(c.I) > .3).length : 0, wh = active * CELL_V * CELL_AH;
      $('[data-m="v"]').textContent = `${V.toFixed(1)} V`; $('[data-m="i"]').textContent = `${Math.abs(I).toFixed(1)} A`; $('[data-m="p"]').textContent = `${Math.round(Math.abs(P))} W`;
      $('[data-m="e"]').textContent = active && P > 5 ? `${wh} Wh · ${(wh / Math.abs(P)).toFixed(1)} h` : '-';
      if (lessonKey === 'ground') { const body = s ? Math.abs(s.v('F')) / BODY_R * 1000 : 0, b = $('[data-m="body"]'); b.textContent = `${body.toFixed(0)} mA`; b.parentElement.classList.toggle('danger', body >= 30); }
      bulbMat.emissiveIntensity = Math.min(3, Math.abs(P) / 330); bulbLight.intensity = Math.min(6, Math.abs(P) / 160);
      const sc = v => new THREE.Color('#3b82f6').lerp(new THREE.Color('#ff7a2f'), Math.max(0, Math.min(1, v / 48)));
      // voltages are measured like a multimeter: from true ground in the grounding lesson, otherwise from the lowest point in the circuit
      const ref = !s || lessonKey === 'ground' ? 0 : Math.min(...[...terms.keys()].filter(id => wires.some(w => w.a === id || w.b === id)).map(id => s.v(id)), 0) || 0;
      for (const [id, t] of terms) { const v = s ? s.v(id) - (wires.some(w => w.a === id || w.b === id) || lessonKey === 'ground' ? ref : s.v(id)) : 0; t.glow.material.color.copy(sc(v)); t.vl.userData.set(Math.abs(v) < .05 ? '0 V' : `${v.toFixed(v < 10 ? 1 : 0)} V`); }
      frameMat.emissive.set(s && Math.abs(s.v('F')) > 5 ? '#ff2a1a' : '#000'); frameMat.emissiveIntensity = s && Math.abs(s.v('F')) > 5 ? .6 : 0;
      return { V, I, P, active };
    };
    const evaluate = (justAdded) => {
      let s = solve(circuit());
      const cellsI = () => CELL_X.map((_, i) => ({ i, I: fuseBlown ? 0 : s.current({ kind: 'cell', a: `c${i}n`, b: `c${i}p`, V: CELL_V }) }));
      let cs = cellsI();
      if (cs.some(c => Math.abs(c.I) > FUSE_A)) {
        if (lessonKey === 'ground' && fault) { fuseBlown = true; s = solve(circuit()); cs = cellsI(); }
        else if (justAdded && performance.now() - lastShort > 300) {
          lastShort = performance.now(); removeWire(justAdded);
          feedback('⚠ <b>Short circuit!</b> That wire joined + straight to − with nothing in between. A huge current would flow, the wire would get red hot, or a fuse would blow. Wire removed.', 'bad');
          el.classList.add('cl-flash'); setTimeout(() => el.classList.remove('cl-flash'), 400); return;
        }
      }
      solved = { v: s.v, cells: cs, wire: w => s.current({ kind: 'wire', a: w.a, b: w.b, R: WIRE_R }) };
      for (const f of flows) f.I = solved.wire(f.w);
      const m = meters(); check(m);
    };
    const check = ({ V, active }) => {
      const L = LESSONS[lessonKey], s = solved;
      if (lessonKey === 'series') {
        if (V >= 44 && active === 4) return win();
        feedback(V < .5 ? 'No light: the lamp needs a <b>complete loop</b>, from a + terminal, through the lamp, back to a − terminal.' :
          V > 0 ? `${V.toFixed(0)} V at the lamp: ${Math.round(V / CELL_V)} cell${Math.round(V / CELL_V) > 1 ? 's' : ''} in series so far. Chain all four, + to −, for 48 V.` :
          'The lamp sees a negative voltage: its + and − are swapped. Lamps don\'t mind, but motors and electronics do. Swap the two lamp wires.');
      } else if (lessonKey === 'parallel') {
        const each = s.cells.map(c => Math.abs(c.I)), lampI = Math.abs(V / LAMP_R);
        if (V > 22 && V < 26 && active === 4 && each.every(I => I > lampI / 2 * .6)) return win();
        feedback(V < .5 ? 'No light yet. Make each 24 V string first (two cells, + to −), then join string + to string + and string − to string −, then the lamp.' :
          V >= 46 ? 'That\'s all four in series: 48 V. For this lesson, build two separate 24 V strings and connect them <b>side by side</b>.' :
          V < 13 && active === 4 ? 'All four cells in parallel: 12 V. That\'s parallel, but too little voltage. Make two pairs in series first (24 V each), then put the pairs in parallel.' :
          active < 4 && V > 20 ? `${V.toFixed(0)} V from one string. Now add the second 24 V string <b>in parallel</b>: its + to the same + point, its − to the same − point.` :
          `${V.toFixed(0)} V at the lamp. Aim for 24 V with all four cells sharing the current.`);
      } else if (lessonKey === 'ground') {
        const frameV = Math.abs(s.v('F'));
        if (stage === 0) feedback('Everything works. Now press <b>⚡ Cause a fault</b>: a worn wire touches the metal frame.');
        if (fault && stage === 0 && frameV > 20) { stage = 1; return feedback(`⚠ <b>The frame is live: ${frameV.toFixed(0)} V.</b> Nothing tripped, and the lamp still glows, so nobody notices. Touch the frame while standing on the soil and ${(frameV / BODY_R * 1000).toFixed(0)} mA would pass through you. That is dangerous. Press <b>Repair the wire</b>, then add the ground wire.`, 'bad'); }
        if (false) { feedback(`⚠ <b>The frame is live: ${frameV.toFixed(0)} V.</b> Nothing tripped, and the lamp still glows, so nobody notices. Touch the frame while standing on the soil and ${(frameV / BODY_R * 1000).toFixed(0)} mA would pass through you. That is dangerous. Press <b>Repair the wire</b>, then add the ground wires.`, 'bad'); }
        if (stage >= 1 && !fault && !fuseBlown) {
          const frameG = isTied('F', 'G'), bonded = isTiedToNeg('G');
          feedback(frameG && bonded ? 'The frame is grounded. Now cause the fault again and watch where the current goes.' : 'Wire the <b>frame</b> terminal to the <b>ground rod</b>.');
          if (frameG && bonded) stage = 2;
        }
        if (fault && stage >= 1) {
          if (fuseBlown && frameV < 1) return win();
          if (frameV < 1 && !fuseBlown) feedback('The frame is safe at 0 V, but the fault current has no way back to the battery, so the fuse never trips and the fault goes unnoticed. Bond the battery\'s − to the ground rod as well.');
          else if (frameV > 20) feedback(`⚠ Still live: ${frameV.toFixed(0)} V on the frame. It needs a wire to the ground rod.`, 'bad');
        }
      }
    };
    const tiedSets = () => {                                     // which terminals are joined by wires
      const parent = new Map(), f = x => { while (parent.get(x) !== undefined && parent.get(x) !== x) x = parent.get(x); return x; };
      for (const id of terms.keys()) parent.set(id, id);
      for (const w of wires) parent.set(f(w.a), f(w.b));
      return f;
    };
    const isTied = (a, b) => { const f = tiedSets(); return f(a) === f(b); };
    const isTiedToNeg = n => { const f = tiedSets(); return ['c0n', 'c1n', 'c2n', 'c3n', 'Ln'].some(t => f(t) === f(n)); };
    const win = () => {
      const L = LESSONS[lessonKey]; feedback('✓ ' + L.done, 'good'); done[lessonKey] = true; onStep?.(lessonKey);
      const next = ORDER[ORDER.indexOf(lessonKey) + 1];
      const b = $('.cl-next'); b.hidden = false; b.textContent = next ? 'Next lesson ›' : 'Finish training ✓';
      b.onclick = () => next ? startLesson(next) : finish();
    };
    const startLesson = k => {
      lessonKey = k; fault = false; fuseBlown = false; stage = 0; fray.visible = false; spark.intensity = 0; clearWires();
      const L = LESSONS[k]; $('.cl-h').textContent = L.title; $('.cl-teach').innerHTML = L.teach.map(p => `<p>${p}</p>`).join(''); $('.cl-task').innerHTML = '<b>Your task:</b> ' + L.task;
      $('.cl-next').hidden = true; $('.cl-fault').hidden = k !== 'ground'; $('.cl-fault').textContent = '⚡ Cause a fault'; $('.cl-body').hidden = k !== 'ground';
      gndG.visible = k === 'ground';
      if (k === 'ground') [['c0p', 'c1n'], ['c1p', 'c2n'], ['c2p', 'c3n'], ['c3p', 'Lp'], ['c0n', 'Ln']].forEach(([a, b]) => connect(a, b));   // start from the 48 V circuit
      if (k === 'ground') connect('c0n', 'G', true);                         // the system bond: battery - to the ground rod (fixed)
      evaluate();
    };
    $('.cl-fault').onclick = () => {
      if (fuseBlown) { fuseBlown = false; fault = false; fray.visible = false; spark.intensity = 0; $('.cl-fault').textContent = '⚡ Cause a fault'; evaluate(); return; }
      fault = !fault; fray.visible = fault; spark.intensity = fault ? 3 : 0; $('.cl-fault').textContent = fault ? 'Repair the wire' : '⚡ Cause a fault'; evaluate();
      if (fuseBlown) { $('.cl-fault').textContent = 'Replace the fuse'; spark.intensity = 0; el.classList.add('cl-flash'); setTimeout(() => el.classList.remove('cl-flash'), 400); }
    };
    $('.cl-reset').onclick = () => startLesson(lessonKey);
    const finish = () => { cancelAnimationFrame(raf); renderer.dispose(); renderer.forceContextLoss?.(); el.classList.add('cl-out'); setTimeout(() => el.remove(), 350); removeEventListener('resize', size); resolve({ ...done }); };
    $('.cl-close').onclick = finish;

    // ---- clicking: terminal then terminal = a wire; a wire = remove it
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
    const preview = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: '#ffd577', dashSize: .06, gapSize: .04 })); preview.visible = false; scene.add(preview);
    const pick = e => { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, cam); return ray.intersectObjects(pickables, false)[0]; };
    canvas.addEventListener('pointerdown', e => {
      const hit = pick(e); if (!hit) { sel = null; preview.visible = false; return; }
      const id = hit.object.userData.term, w = hit.object.userData.wire;
      if (w && !sel) { if (w.fixed) { feedback('That green-yellow wire is the system bond: the battery\'s − tied to the ground rod. It stays.'); return; } removeWire(w); feedback('Wire removed.'); return; }
      if (!id) return;
      if (!sel) { sel = id; feedback(`Selected the ${terms.get(id).pole === '+' ? 'red <b>+</b>' : terms.get(id).pole === 'g' ? 'ground' : 'black <b>−</b>'} terminal. Now click where the wire should go.`); return; }
      const a = sel; sel = null; preview.visible = false; connect(a, id);
    });
    canvas.addEventListener('pointermove', e => {
      if (!sel) return; const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, cam);
      const p = new THREE.Vector3(); ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -.1), p);
      preview.geometry.setFromPoints([terms.get(sel).top(), p]); preview.computeLineDistances(); preview.visible = true;
    });

    // ---- loop: flowing current dots, selection pulse
    const size = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 1.1 ? 58 : 38;
      const pw = w > 760 ? $('.cl-panel').offsetWidth + 16 : 0; if (pw) cam.setViewOffset(w, h, -pw / 2, 0, w, h); else cam.clearViewOffset();   // keep the bench clear of the lesson panel
      cam.updateProjectionMatrix(); };
    addEventListener('resize', size); size();
    const m4 = new THREE.Matrix4(); let raf = 0, last = performance.now();
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      for (const f of flows) {
        const on = Math.abs(f.I) > .05; f.dots.visible = on; if (!on) continue;
        const speed = Math.min(1.2, .12 + Math.log10(1 + Math.abs(f.I)) * .35) * Math.sign(f.I);   // conventional current a -> b when I > 0
        f.t = (f.t + speed * dt + 10) % 1;
        for (let k = 0; k < 10; k++) { const u = (f.t + k / 10) % 1; m4.makeTranslation(f.curve.getPoint(u)); f.dots.setMatrixAt(k, m4); }
        f.dots.instanceMatrix.needsUpdate = true;
        f.dots.material.color.set(Math.abs(f.I) > FUSE_A * .8 ? '#ffd27a' : '#7ff0ff');
      }
      for (const [id, t] of terms) t.cap.scale.setScalar(id === sel ? 1.15 + Math.sin(now / 120) * .08 : 1);
      if (fault && !fuseBlown) spark.intensity = 2 + Math.random() * 3;
      renderer.render(scene, cam); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    el.lab = { connect, removeAll: () => startLesson(lessonKey), fault: () => $('.cl-fault').click(), lesson: () => lessonKey, readings: () => meters(), startLesson, terms: () => [...terms.keys()] };   // for tests
    startLesson(start);
  });
}
