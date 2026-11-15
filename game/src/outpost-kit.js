// The working surface base: everything a real Mars outpost needs outside the pressure modules.
//
//   comms and sensing   relay mast with a dish and whip antennas, exterior cameras, weather station (spinning
//                       anemometer), a domed seismometer on a tether, floodlight masts, landing-pad lights
//   dust control        dust-lock chamber, air-blast arch, magnetic dust trap, dust collection bins beside the door
//   ISRU yard           regolith hopper and screen, oxygen extraction plant, water (ice) extraction rig, ice storage
//                       tanks, methane/oxygen fuel plant with cryo spheres and a flare stack, pipe rack, control cabin
//   survival            buried storm shelter with a radiation refuge, shielding-block stacks, a regolith berm wall
//   wear                grime, scuffs and edge wear on painted metal, mismatched replacement panels, temporary labels,
//                       dents, tool marks, dust drifted against the doors and at the foot of every machine
//
// Everything is procedural (no downloads) and static parts are merged per material, so the whole kit is a few dozen
// draw calls. Called once from settlement.js. Nothing here touches the mission logic: the shelter, soil berms and
// cables the missions build are separate; this only dresses the site and adds a few colliders.
import * as THREE from 'three';
import { mergeStatic } from './static-merge.js';
import { createRockContact } from './rock-contact.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Bake collision triangles before render merging removes the original parts. This mesh
// is never added to the scene, so accurate equipment gaps cost no extra draw calls.
function meshCollider(group) {
  group.updateWorldMatrix(true, true);
  const parts = [];
  group.traverse(o => {
    if (!o.isMesh || o.material.transparent) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld); parts.push(g);
  });
  const geometry = mergeGeometries(parts, false); parts.forEach(g => g.dispose());
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  return { x: center.x, z: center.z, r: Math.hypot(size.x, size.z) / 2,
    object: group, roverBounds: { x: center.x, z: center.z, halfX: size.x / 2, halfZ: size.z / 2 }, surfaceContact: createRockContact(mesh) };
}

const TAU = Math.PI * 2;
let seed = 11;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const matCache = {};
const std = (key, color, extra = {}) => (matCache[key] ??= new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: .1, ...extra }));
const DS = THREE.DoubleSide;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t;
}
// Painted metal that has lived outside: a base coat, long scratches, bright worn edges, a darker grime band along the
// bottom, rain-streak-like dust runs and a few touched-up patches in a slightly different white.
function wornPaint(base, { grime = '#5a4a3c', patches = true } = {}) {
  seed = 5;
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '40,30,20'},${.04 + rnd() * .05})`; g.fillRect(rnd() * w, rnd() * h, 20 + rnd() * 90, 8 + rnd() * 30); }   // mottling
    if (patches) for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(255,255,250,.35)`; g.fillRect(rnd() * (w - 70), rnd() * (h - 60), 40 + rnd() * 30, 30 + rnd() * 25); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; }
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(${rnd() < .6 ? '30,25,20' : '255,255,255'},${.12 + rnd() * .15})`; g.lineWidth = .6 + rnd() * .8; g.beginPath(); const x = rnd() * w, y = rnd() * h; g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 70, y + (rnd() - .5) * 18); g.stroke(); }   // scratches
    const gr = g.createLinearGradient(0, h * .55, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, grime + '88'); g.fillStyle = gr; g.fillRect(0, h * .55, w, h * .45);   // dust thrown up from the ground
    for (let i = 0; i < 9; i++) { const x = rnd() * w, gg = g.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, 'rgba(110,80,55,0)'); gg.addColorStop(1, 'rgba(110,80,55,.22)'); g.fillStyle = gg; g.fillRect(x, 0, 2 + rnd() * 5, h); }   // streaks
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);   // worn bright edges
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.strokeRect(5, 5, w - 10, h - 10);
  });
}
const label = (() => {   // small printed or hand-written labels, cached by text
  const cache = {};
  return (text, { bg = '#f4f1e8', fg = '#1d2a33', w = 256, h = 64, font = 'bold 30px system-ui', tape = false } = {}) => {
    const key = [text, bg, fg, w, h, font, tape].join('|');
    return cache[key] ??= new THREE.MeshStandardMaterial({ roughness: .6, map: canvasTex(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      if (tape) { g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -h; x < w; x += 22) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.lineTo(x + h + 11, 0); g.lineTo(x + 11, h); g.fill(); } }
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
      g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = text.split('\n'); lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (h / (lines.length + .4)))); }) });
  };
})();

export function dressOutpost({ world, heightAt, layout, access }) {
  const scene = world.scene, root = new THREE.Group(); root.name = 'outpost-kit'; scene.add(root);
  const live = [];   // things that move: excluded from the static merge
  const colliders = world.colliders;
  const paint = std('paintWhite', '#ffffff', { map: wornPaint('#ece8e1'), roughness: .62 });
  const paintGrey = std('paintGrey', '#ffffff', { map: wornPaint('#a9b0b6', { patches: false }), roughness: .6, metalness: .2 });
  const steel = std('steel', '#b9c0c6', { roughness: .45, metalness: .65 });
  const darkM = std('dark', '#25292d', { roughness: .65, metalness: .3 });
  const black = std('black', '#16181a', { roughness: .8 });
  const yellow = std('yellow', '#e8b923', { roughness: .55 });
  const red = std('red', '#b3261e', { roughness: .5 });
  const blue = std('blue', '#2f64b5', { roughness: .5 });
  const green = std('green', '#2e8b57', { roughness: .5 });
  const regolith = std('regolith', '#80614c', { roughness: 1 });
  const regolithDark = std('regolithDark', '#5e4636', { roughness: 1 });
  const concrete = std('slab', '#ffffff', { roughness: .95, map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#a39d94'; g.fillRect(0, 0, w, h); seed = 9; for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,240,225'},${.03 + rnd() * .05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(90,60,40,.08)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 20 + rnd() * 40, 0, TAU); g.fill(); } }) });
  const frost = std('frost', '#dfeaf0', { roughness: .5, metalness: .2 });
  const rust = std('rust', '#8a5a3b', { roughness: .85, metalness: .3 });
  const newPanel = std('newPanel', '#f6f4ee', { roughness: .45 });   // a replacement panel: cleaner and a different white
  const glowWhite = new THREE.MeshBasicMaterial({ color: '#fff4de' }), glowRed = new THREE.MeshBasicMaterial({ color: '#ff3b30' }), glowBlue = new THREE.MeshBasicMaterial({ color: '#6fb6ff' }), glowGreen = new THREE.MeshBasicMaterial({ color: '#7dffb2' });

  // ---- tiny constructors ----
  const add = (parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  const box = (p, w, h, d, m, x, y, z, rx, ry, rz) => add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
  const cyl = (p, r1, r2, h, m, x, y, z, rx, ry, rz, seg = 20) => add(p, new THREE.CylinderGeometry(r1, r2, h, seg), m, x, y, z, rx, ry, rz);
  const sph = (p, r, m, x, y, z, sx = 1, sy = 1, sz = 1, seg = 20) => { const o = add(p, new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1)), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
  const rod = (p, a, b, r, m) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), m); o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); o.castShadow = true; p.add(o); return o; };
  const sign = (p, text, w, h, x, y, z, ry = 0, opt = {}) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), label(text, { w: 256, h: Math.round(256 * h / w), ...opt })); o.position.set(x, y, z); o.rotation.y = ry; p.add(o); return o; };
  const supportedSign = (p, text, w, h, x, y, z, ry = 0, opt = {}, floorAt = () => 0) => {
    const frame = new THREE.Group(); frame.position.set(x, 0, z); frame.rotation.y = ry; p.add(frame);
    sign(frame, text, w, h, 0, y, 0, 0, opt);
    const bottom = y - h / 2;
    for (const u of [-1, 1]) {
      const dx = Math.cos(ry) * u * (w / 2 - .1), dz = -Math.sin(ry) * u * (w / 2 - .1);
      const floor = floorAt(x + dx, z + dz), height = Math.max(.08, bottom - floor);
      box(frame, .055, height, .065, steel, u * (w / 2 - .1), floor + height / 2, 0);
      box(frame, .28, .07, .26, darkM, u * (w / 2 - .1), floor + .035, 0);
      box(frame, .12, .06, .1, steel, u * (w / 2 - .1), bottom - .03, -.025);
    }
    box(frame, w - .12, .055, .07, paintGrey, 0, bottom - .035, -.035);
    return frame;
  };
  const bolts = (p, pts, r = .018, m = steel) => pts.forEach(([x, y, z]) => cyl(p, r, r, .012, m, x, y, z, Math.PI / 2, 0, 0, 6));
  const ground = (x, z) => heightAt(x, z);
  const place = (g, x, z, yaw = 0, y) => { g.position.set(x, y ?? ground(x, z), z); g.rotation.y = yaw; root.add(g); return g; };
  // a slab under a footprint: top at the highest ground point, skirt down to the lowest, so nothing hovers on a slope
  const slab = (cx, cz, w, d, yaw = 0, m = concrete) => {
    let lo = 1e9, hi = -1e9; const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const x = cx + u * w / 2 * c + v * d / 2 * s, z = cz - u * w / 2 * s + v * d / 2 * c, h = ground(x, z); lo = Math.min(lo, h); hi = Math.max(hi, h); }
    const top = hi + .1, g = new THREE.Mesh(new THREE.BoxGeometry(w, top - lo + .3, d), m); g.position.set(cx, (top + lo - .3) / 2, cz); g.rotation.y = yaw; g.receiveShadow = true; root.add(g); return top;
  };
  // soft dark ring of blown dust and oil stains where a machine meets the ground
  const grimeTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, w * .16, w / 2, h / 2, w * .5); gr.addColorStop(0, 'rgba(30,22,16,.55)'); gr.addColorStop(1, 'rgba(30,22,16,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const grimeMat = new THREE.MeshBasicMaterial({ map: grimeTex, transparent: true, depthWrite: false, opacity: .8, polygonOffset: true, polygonOffsetFactor: -2 });
  const grime = (p, w, d, x = 0, z = 0, y = .03) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), grimeMat); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.renderOrder = 2; p.add(o); return o; };
  const handrail = (p, x0, z0, x1, z1, y = 1.05, m = yellow) => { const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0); for (const yy of [y, y * .5]) { const r = cyl(p, .022, .022, len, m, (x0 + x1) / 2, yy, (z0 + z1) / 2, Math.PI / 2, 0, 0, 8); r.rotation.set(Math.PI / 2, 0, 0); r.rotation.order = 'YXZ'; r.rotation.set(Math.PI / 2, a, 0); } for (let t = 0; t <= 1.001; t += 1 / Math.max(1, Math.round(len / 1.6))) cyl(p, .022, .022, y, m, x0 + (x1 - x0) * t, y / 2, z0 + (z1 - z0) * t, 0, 0, 0, 8); };
  const stair = (p, w, h, run, x, z, ry = 0, steps = 6) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); for (let i = 0; i < steps; i++) box(g, w, .04, run / steps, steel, 0, h / steps * (i + 1), run - run / steps * (i + .5)); for (const s of [-1, 1]) rod(g, [s * w / 2, 0, run], [s * w / 2, h, 0], .025, yellow); return g; };

  // ====================================================================================================
  // 1. DUST CONTROL by the first entrance: dust-lock chamber, air-blast arch, magnetic trap, collection bins
  // ====================================================================================================
  const e = access.entrances[0], ex = e.x, ez = e.bottom ?? e.doorZ + 4;
  {
    // dust-lock: a small chamber you pass through before the airlock, bolted to the west of the access ramp
    const D = new THREE.Group(); const dz = ez + .6;
    place(D, ex - 4.6, dz, 0);
    const top = slab(ex - 4.6, dz, 3.8, 3.2);
    D.position.y = top;
    box(D, 3.2, 2.6, 2.6, paint, 0, 1.3, 0); box(D, 3.3, .12, 2.7, paintGrey, 0, 2.62, 0);
    box(D, 1.3, 2.1, .1, darkM, .55, 1.12, 1.33); box(D, 1.4, 2.2, .06, steel, .55, 1.12, 1.31);   // hatch door and frame
    cyl(D, .17, .17, .06, darkM, .55, 1.75, 1.38, Math.PI / 2, 0, 0, 20); cyl(D, .1, .1, .05, std('portGlass', '#123f4d', { roughness: .15, metalness: .6 }), .55, 1.75, 1.41, Math.PI / 2, 0, 0, 20);
    box(D, .08, .3, .08, steel, .0, 1.1, 1.42);                                                    // worn handle
    box(D, .5, .5, .06, newPanel, -.9, 1.25, 1.33); bolts(D, [[-1.12, 1.47, 1.37], [-.68, 1.47, 1.37], [-1.12, 1.03, 1.37], [-.68, 1.03, 1.37]], .02, darkM);   // replaced panel with fresh bolts
    sign(D, 'DUST LOCK\nBRUSH · VACUUM', 1.15, .42, -.78, 2.1, 1.34, 0, { bg: '#1c3340', fg: '#e9f4ef', font: 'bold 28px system-ui' });
    sign(D, 'TEMP: DOOR STICKS\nSEE LOG 114 -F', .55, .3, -1.1, .55, 1.34, 0, { bg: '#f2e46a', fg: '#222', font: '22px "Comic Sans MS", cursive', tape: false });
    box(D, 1.0, .02, 1.6, black, .55, .015, 2.2);   // door mat, black with dust
    cyl(D, .09, .09, 1.3, steel, 1.45, .75, 1.55, 0, 0, 0, 10); box(D, .3, .06, .3, steel, 1.45, .06, 1.55);   // vacuum stand
    for (const x of [-1.2, 1.2]) cyl(D, .05, .05, .6, steel, x, 2.95, -.8, 0, 0, 0, 8);          // vents and a small exhaust
    box(D, 1.0, .35, .5, paintGrey, -.7, 2.9, -.4);                                               // filter box
    box(D, 2.6, .05, .05, yellow, 0, .4, 1.35);   // kick rail
    cyl(D, .13, .13, .03, yellow, 1.4, 1.6, 1.33, Math.PI / 2, 0, 0, 14); cyl(D, .08, .08, .05, glowRed, 1.4, 1.6, 1.36, Math.PI / 2, 0, 0, 14);                      // emergency stop
    grime(D, 5.2, 4.4, 0, .7); colliders.push({ x: ex - 4.6, z: dz, r: 2.2, object: D });
    // air-blast arch straddling the approach: nozzles blow the dust off a suit before the door
    const A = new THREE.Group(); place(A, ex, ez + 3.8, 0);
    for (const s of [-1, 1]) { box(A, .22, 2.9, .3, paintGrey, s * 1.7, 1.45, 0); box(A, .5, .08, .6, darkM, s * 1.7, .04, 0); }
    box(A, 3.8, .26, .34, paint, 0, 2.95, 0);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) cyl(A, .02, .025, .18, steel, s * 1.58, .5 + i * .45, 0, 0, 0, Math.PI / 2 * s, 6);
    for (let i = 0; i < 4; i++) cyl(A, .02, .025, .2, steel, -.9 + i * .6, 2.8, 0, 0, 0, 0, 6);
    cyl(A, .06, .06, 3.4, blue, 0, 3.12, -.12, 0, 0, Math.PI / 2, 10);                             // air main
    sign(A, 'AIR-BLAST\nSTOP · ARMS UP', 1.2, .36, 0, 2.95, .18, 0, { bg: '#e8b923', fg: '#161616', font: 'bold 26px system-ui' });
    box(A, .5, .3, .16, black, 1.5, 1.9, .2); box(A, .08, .08, .02, glowGreen, 1.5, 1.95, .29);  // control box
    cyl(A, .03, .03, .9, black, 2.4, .5, .9, Math.PI / 2, 0, 0, 6);                                 // hose
    // magnetic dust trap: the Martian dust is full of magnetite, so a magnet array under a grating pulls it out of the air and off boots
    const mat = new THREE.Group(); place(mat, ex, ez + 3.8, 0); mat.position.y += .03;
    box(mat, 3.0, .06, 1.6, darkM, 0, .03, 0);
    for (let i = 0; i < 12; i++) box(mat, .1, .08, 1.5, i % 2 ? steel : red, -1.4 + i * .255, .05, 0);   // magnet bars under a slotted plate
    box(mat, 3.1, .02, .05, yellow, 0, .09, .83); box(mat, 3.1, .02, .05, yellow, 0, .09, -.83);
    sign(mat, 'MAGNETIC DUST TRAP', .9, .16, 0, .02, 1.0, 0, { bg: '#1c1c1c', fg: '#f2c230', font: 'bold 26px monospace' }).rotation.x = -Math.PI / 2;
    // collection bins with a hand-written warning, one dented
    for (let k = 0; k < 3; k++) {
      const B = new THREE.Group(); place(B, ex + 3.4 + k * .8, ez + 3.4 + (k % 2) * .25, .2 * k - .2);
      box(B, .7, .9, .6, k === 1 ? rust : paintGrey, 0, .5, 0); box(B, .76, .08, .66, steel, 0, .98, 0); box(B, .12, .05, .06, red, 0, 1.03, .3);
      if (k === 2) { const d = box(B, .3, .3, .06, darkM, .1, .5, .32); d.rotation.set(.1, 0, .3); }   // a dent
      sign(B, k === 0 ? 'DUST\nBIN 1' : k === 1 ? 'REGOLITH\nNOT FOOD' : 'FILTERS\nUSED', .5, .26, 0, .55, .31, 0, { bg: '#f4f1e8', font: 'bold 26px system-ui', tape: k === 1 });
      grime(B, 1.6, 1.4, 0, 0);
    }
    // dust drifted against the ramp and the door: a low wedge of fine regolith in the lee
    for (const s of [-1, 1]) { const w = sph(root, 1, regolith, ex + s * 1.7, ground(ex + s * 1.7, e.doorZ + 1) + .05, e.doorZ + 1.2, .9, .28, 1.8, 14); w.receiveShadow = true; }
    const trackTex = canvasTex(128, 256, (g, w, h) => { seed = 21; g.clearRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(70,45,30,${.1 + rnd() * .2})`; g.fillRect(40 + (rnd() - .5) * 40, rnd() * h, 14 + rnd() * 10, 22 + rnd() * 18); } });
    const tracks = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 6), new THREE.MeshBasicMaterial({ map: trackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); tracks.rotation.x = -Math.PI / 2; tracks.position.set(ex, ground(ex, ez + 1) + .03, ez + 1); root.add(tracks);   // bootprints worn into the approach
    root.add(A, mat);
  }

  // ====================================================================================================
  // 2. COMMS AND SENSING west of the module row
  // ====================================================================================================
  const west = layout.moduleColliders[0];
  {
    const M = new THREE.Group(); const mx = west.x - 8, mz = west.z - 5; place(M, mx, mz, .3);
    slab(mx, mz, 2.4, 2.4);
    // lattice relay mast: three legs, ring braces, platform with a dish and whip antennas
    const H = 12, R0 = .8, R1 = .22;
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; rod(M, [Math.cos(a) * R0, 0, Math.sin(a) * R0], [Math.cos(a) * R1, H, Math.sin(a) * R1], .05, paintGrey); }
    for (let lvl = 1; lvl <= 6; lvl++) { const t = lvl / 7, y = H * t, r = R0 + (R1 - R0) * t; for (let k = 0; k < 3; k++) { const a = k * TAU / 3, b = (k + 1) * TAU / 3; rod(M, [Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(b) * r, y, Math.sin(b) * r], .02, steel); const y2 = H * (lvl + 1) / 7, r2 = R0 + (R1 - R0) * (lvl + 1) / 7; if (lvl < 6) rod(M, [Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(b) * r2, y2, Math.sin(b) * r2], .014, steel); } }
    cyl(M, .55, .55, .06, steel, 0, H, 0, 0, 0, 0, 16);
    const dish = new THREE.Group(); dish.position.set(.0, H + .6, 0); M.add(dish);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 10, 0, TAU, 0, Math.PI / 3.2), std('dish', '#f0eee8', { roughness: .45, metalness: .3, side: DS })); bowl.rotation.x = -Math.PI / 2.4; bowl.castShadow = true; dish.add(bowl);
    rod(dish, [0, -.2, 0], [0, .2, .9], .03, steel); cyl(dish, .06, .06, .3, darkM, 0, .45, 1.1, Math.PI / 2.4, 0, 0, 8);   // feed horn on a strut
    box(M, .5, .35, .3, paintGrey, .6, H - .5, 0); bolts(M, [[.4, H - .4, .16], [.8, H - .4, .16]]);
    for (const [x, z, h] of [[-.4, .3, 2.2], [.3, -.5, 3.1], [-.2, -.5, 1.6]]) { cyl(M, .008, .008, h, steel, x, H + h / 2, z, 0, 0, 0, 5); }   // whips
    // UHF yagi
    const yagi = new THREE.Group(); yagi.position.set(-.5, H - 2.4, .1); yagi.rotation.y = 1.0; M.add(yagi); cyl(yagi, .015, .015, 1.4, steel, 0, 0, 0, Math.PI / 2, 0, 0, 5); for (let i = 0; i < 6; i++) cyl(yagi, .006, .006, .6 - i * .05, steel, -.6 + i * .24, 0, 0, 0, 0, Math.PI / 2, 4);
    // exterior camera, pan-tilt housing with a hood, and a flood lamp on the same mast
    const cam = new THREE.Group(); cam.position.set(.35, 6.0, .4); M.add(cam); box(cam, .3, .22, .4, paint, 0, 0, 0); cyl(cam, .07, .07, .1, black, 0, 0, .25, Math.PI / 2, 0, 0, 12); box(cam, .34, .04, .5, paintGrey, 0, .13, .02); cyl(cam, .02, .02, .2, steel, 0, -.2, 0, 0, 0, 0, 6);
    const lamp = new THREE.Group(); lamp.position.set(-.35, 7.2, -.3); lamp.rotation.set(.5, .6, 0); M.add(lamp); box(lamp, .5, .3, .15, darkM, 0, 0, 0); box(lamp, .42, .22, .02, glowWhite, 0, 0, .09);
    // equipment cabinet at the base, with a temporary label and a mismatched replacement door
    box(M, 1.1, 1.3, .6, paint, -1.6, .65, .6); box(M, .5, .9, .03, newPanel, -1.9, .65, .92); bolts(M, [[-2.1, 1.05, .94], [-1.7, 1.05, .94], [-2.1, .25, .94], [-1.7, .25, .94]], .02, darkM); sign(M, 'COMMS RELAY 2\nUHF · X-BAND', .6, .2, -1.35, 1.05, .91, 0, { bg: '#f4f1e8', font: 'bold 22px system-ui' }); sign(M, 'BAD FAN?\nRESET @ SOL 40', .36, .2, -1.35, .55, .91, 0, { bg: '#f2e46a', font: '16px "Comic Sans MS", cursive' });
    grime(M, 4, 4); colliders.push({ x: mx, z: mz, r: 1.1, object: M });
    // weather station: a 3 m mast with spinning cups, a wind vane, a louvred screen, a pressure box and its own small panel
    const W = new THREE.Group(); const wx = west.x - 12, wz = west.z + 4; place(W, wx, wz, 0); slab(wx, wz, 1.4, 1.4);
    cyl(W, .035, .045, 3.2, steel, 0, 1.6, 0, 0, 0, 0, 8); box(W, .06, .06, 1.2, steel, 0, 3.0, 0);
    const cups = new THREE.Group(); cups.position.set(0, 3.25, 0); W.add(cups); live.push(cups); for (let i = 0; i < 3; i++) { const a = i * TAU / 3; rod(cups, [0, 0, 0], [Math.cos(a) * .22, 0, Math.sin(a) * .22], .008, steel); sph(cups, .06, paintGrey, Math.cos(a) * .22, 0, Math.sin(a) * .22, 1, .8, 1, 8); }
    cups.onBeforeRender = () => { cups.rotation.y = performance.now() * .006; };
    const vane = new THREE.Group(); vane.position.set(0, 3.0, 0); W.add(vane); box(vane, .5, .1, .015, red, .1, 0, 0); box(vane, .2, .02, .12, red, .38, 0, 0); live.push(vane); vane.onBeforeRender = () => { vane.rotation.y = 1.2 + Math.sin(performance.now() * .0004) * .35; };
    box(W, .5, .6, .4, paint, .6, 1.2, 0); for (let i = 0; i < 7; i++) box(W, .52, .02, .42, white(), .6, .95 + i * .08, 0); box(W, .06, .06, .06, glowGreen, .6, 1.58, .22);   // louvred screen
    box(W, .3, .25, .2, paintGrey, -.5, 1.0, .1); cyl(W, .02, .02, .5, steel, -.5, 1.4, .1, 0, 0, 0, 6); box(W, .4, .02, .3, std('pv', '#1d2a55', { roughness: .3, metalness: .5 }), -.5, 1.62, .1, -.5, 0, 0);
    sign(W, 'MET STATION 1\nT · P · WIND · DUST', .6, .25, .6, .55, .22, 0, { bg: '#f4f1e8', font: 'bold 20px system-ui' });
    function white() { return std('louvre', '#d8d6cf', { roughness: .5 }); }
    grime(W, 2.4, 2.4);
    // seismometer: a domed shell on the ground, tethered, with a wind shield skirt (as on InSight)
    const S = new THREE.Group(); const sx = west.x - 17, sz = west.z + 1; place(S, sx, sz, 0);
    cyl(S, .85, .95, .12, regolithDark, 0, .06, 0, 0, 0, 0, 28); const dome = sph(S, .6, std('shield', '#cfd3d6', { roughness: .4, metalness: .55 }), 0, .12, 0, 1, .7, 1, 24); cyl(S, .62, .66, .06, std('foil', '#d8b14a', { roughness: .3, metalness: .85 }), 0, .14, 0, 0, 0, 0, 24);
    box(S, .3, .2, .3, paintGrey, .0, .62, 0);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sx, ground(sx, sz) + .15, sz), new THREE.Vector3(sx + 2, ground(sx + 2, sz - 1) + .08, sz - 1), new THREE.Vector3(sx + 4, ground(sx + 4, sz - 3) + .08, sz - 3), new THREE.Vector3(mx, ground(mx, mz) + .5, mz + 1.4)]), 30, .035, 6, false), black); cable.castShadow = false; root.add(cable);
    sign(S, 'SEIS-1 · DO NOT\nDRIVE OVER', .8, .26, 0, .08, 1.0, 0, { bg: '#e8b923', fg: '#161616', font: 'bold 22px system-ui' }).rotation.x = -1.2;
    // a cairn of four posts with a tape perimeter
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + .78; cyl(S, .03, .03, .7, yellow, Math.cos(a) * 2.2, .35, Math.sin(a) * 2.2, 0, 0, 0, 6); }
    grime(S, 3, 3);
    for (const g of [M, W, S]) g.userData.kit = true;
  }

  // ====================================================================================================
  // 3. FLOODLIGHT MASTS around the base and LANDING-PAD LIGHTS around the lander
  // ====================================================================================================
  const floodMast = (x, z, h = 7, yaw = 0, cams = false) => {
    const F = new THREE.Group(); place(F, x, z, yaw); slab(x, z, .9, .9);
    cyl(F, .08, .12, h, paintGrey, 0, h / 2, 0, 0, 0, 0, 10); cyl(F, .2, .2, .1, steel, 0, .05, 0, 0, 0, 0, 12); bolts(F, [[.14, .12, 0], [-.14, .12, 0], [0, .12, .14], [0, .12, -.14]], .02);
    box(F, 1.1, .08, .1, steel, 0, h, 0);
    for (const s of [-.45, 0, .45]) { const L = new THREE.Group(); L.position.set(s, h + .02, .1); L.rotation.x = .5; F.add(L); box(L, .38, .26, .14, darkM, 0, 0, 0); box(L, .3, .2, .02, glowWhite, 0, 0, .08); box(L, .42, .03, .22, paintGrey, 0, .15, .04); }
    box(F, .3, .4, .2, paint, 0, 1.4, .18); sign(F, `FL-${Math.round(x + z) & 15}`, .18, .08, 0, 1.55, .29, 0, { w: 128, h: 64, font: 'bold 28px monospace' });
    if (cams) { const c = new THREE.Group(); c.position.set(0, h - 1.2, .18); F.add(c); box(c, .22, .18, .32, paint, 0, 0, 0); cyl(c, .06, .06, .08, black, 0, 0, .2, Math.PI / 2, 0, 0, 10); box(c, .26, .03, .4, paintGrey, 0, .1, .02); }
    rod(F, [0, 1.2, 0], [.0, 1.2, 1.3], .012, black); grime(F, 2.2, 2.2);
    colliders.push({ x, z, r: .4, object: F }); return F;
  };
  {
    const first = layout.moduleColliders[0], last = layout.moduleColliders[layout.moduleColliders.length - 1];
    floodMast(first.x - 4.5, first.z + 8.5, 7.5, .2, true); floodMast(last.x + 4.8, last.z + 8.5, 7.5, -.2, true);
    floodMast(first.x - 4.5, first.z - 8.5, 7.5, 3.1); floodMast(last.x + 4.8, last.z - 8.5, 7.5, 3.1, true);
    floodMast((first.x + last.x) / 2, first.z - 9.5, 7.5, 3.1);
    // landing pad: a sintered-regolith disc with a ring, a yellow H, edge lights and a blast berm behind it
    const lander = world.outpost.group.getObjectByName('lander');
    if (lander) {
      const px = lander.position.x, pz = lander.position.z, PR = 13;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR + .4, .24, 56), std('pad', '#ffffff', { roughness: .95, map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#857f77'; g.fillRect(0, 0, w, h); seed = 33; for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,235,210'},${.03 + rnd() * .05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(20,12,8,.1)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 14 + rnd() * 50, 0, TAU); g.fill(); } g.strokeStyle = '#d8d3c8'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w * .46, 0, TAU); g.stroke(); g.strokeStyle = '#e8b923'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2, w * .36, 0, TAU); g.stroke(); g.fillStyle = '#e8b923'; g.fillRect(w / 2 - 60, h / 2 - 80, 18, 160); g.fillRect(w / 2 + 42, h / 2 - 80, 18, 160); g.fillRect(w / 2 - 60, h / 2 - 10, 120, 18); }) }));
      let hi = -1e9, lo = 1e9; for (let i = 0; i < 16; i++) { const h = ground(px + Math.cos(i * TAU / 16) * PR, pz + Math.sin(i * TAU / 16) * PR); hi = Math.max(hi, h); lo = Math.min(lo, h); }
      disc.position.set(px, hi + .02, pz); disc.scale.y = 1; disc.receiveShadow = true; root.add(disc);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(PR + .4, PR + 2.6, hi - lo + .8, 56, 1, true), regolith); skirt.position.set(px, (hi + lo) / 2 - .3, pz); root.add(skirt);
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + .1, x = px + Math.cos(a) * (PR - .6), z = pz + Math.sin(a) * (PR - .6), L = new THREE.Group(); L.position.set(x, hi + .12, z); root.add(L);
        cyl(L, .17, .2, .14, darkM, 0, 0, 0, 0, 0, 0, 12); const c = cyl(L, .12, .12, .05, i % 3 === 0 ? glowBlue : glowWhite, 0, .09, 0, 0, 0, 0, 12); box(L, .5, .02, .5, black, 0, -.04, 0); }
      for (const a of [Math.PI * .25, Math.PI * .75, Math.PI * 1.25, Math.PI * 1.75]) { const x = px + Math.cos(a) * (PR + 1.6), z = pz + Math.sin(a) * (PR + 1.6), T = new THREE.Group(); place(T, x, z, 0); cyl(T, .05, .06, 3.2, paintGrey, 0, 1.6, 0, 0, 0, 0, 8); sph(T, .12, glowRed, 0, 3.3, 0); }
      const sx = px + PR * .65, sz = pz + PR * .7, yaw = Math.atan2(-(PR * .65), -(PR * .7));
      const landingSign = supportedSign(root, 'LANDING ZONE · KEEP CLEAR\nDUST · DEBRIS', 2.8, .78, sx, ground(sx, sz) + 1.25, sz, yaw, { bg: '#e8b923', fg: '#161616', font: 'bold 32px system-ui' }, ground);
      colliders.push({ x: sx, z: sz, r: 1.55, object: landingSign });
    }
  }

  // ====================================================================================================
  // 4. ISRU YARD beside the east end of the row: regolith, oxygen, water, ice, fuel
  // ====================================================================================================
  {
    const last = layout.moduleColliders[layout.moduleColliders.length - 1];
    const cx = last.x + 14, cz = last.z + 1, Y = new THREE.Group();
    const top = slab(cx, cz, 17, 19, 0); place(Y, cx, cz, 0, top);
    for (let i = -3; i <= 3; i++) { box(Y, .04, .02, 19, black, i * 2.4, .005, 0); box(Y, 17, .02, .04, black, 0, .006, i * 2.7); }   // expansion joints
    for (const [x, z, w, d] of [[-3, -7, 1.6, 1.2], [4, -1, 2, 1.6], [-5, 4, 1.4, 1.4]]) grime(Y, w * 3, d * 3, x, z);
    // control cabin: an ISO container with a window, split AC, steps and a handrail
    const C = new THREE.Group(); C.position.set(-5.5, 0, -6.6); Y.add(C);
    box(C, 6, 2.5, 2.4, paint, 0, 1.5, 0); box(C, 6.1, .2, 2.5, paintGrey, 0, .1, 0); box(C, 6.1, .08, 2.5, paintGrey, 0, 2.78, 0);
    for (let i = 0; i < 9; i++) box(C, .03, 2.4, .02, steel, -2.8 + i * .7, 1.5, 1.22);   // corrugation ribs
    box(C, 1.0, 2.0, .06, darkM, -1.9, 1.3, 1.26); box(C, 1.4, .8, .06, std('winGlass', '#1c3a47', { roughness: .15, metalness: .5 }), .6, 1.7, 1.25); box(C, 1.5, .9, .05, steel, .6, 1.7, 1.23);
    box(C, 1.1, .5, .35, paintGrey, 2.2, 2.0, 1.4); cyl(C, .2, .2, .08, black, 2.2, 2.0, 1.6, Math.PI / 2, 0, 0, 16);   // split AC
    box(C, .7, .5, .06, newPanel, 1.9, 1.0, 1.25); bolts(C, [[1.58, 1.22, 1.29], [2.22, 1.22, 1.29], [1.58, .78, 1.29], [2.22, .78, 1.29]], .02, darkM);
    stair(C, .9, .3, 1.1, -1.9, 1.3, 0, 2);
    sign(C, 'ISRU CONTROL\nHARD HATS · SUITS', 1.4, .42, -.1, 2.55, 1.25, 0, { bg: '#1c3340', fg: '#e9f4ef', font: 'bold 28px system-ui' });
    sign(C, 'DO NOT STACK\nBOXES HERE', .6, .26, 2.2, .5, 1.25, 0, { bg: '#f2e46a', fg: '#222', font: '18px "Comic Sans MS", cursive' });
    grime(C, 8, 4.4); colliders.push({ x: cx - 5.5, z: cz - 6.6, r: 3.2, halfX: 3, halfZ: 1.3, object: C });
    // oxygen extraction plant: three insulated reactor vessels (like MOXIE, scaled up), a compressor skid, a ladder and a tall exhaust
    const O = new THREE.Group(); O.position.set(3.2, 0, -6.5); Y.add(O);
    box(O, 8, .16, 4.4, paintGrey, 0, .08, 0);
    for (let i = 0; i < 3; i++) { const x = -2.6 + i * 2.2; cyl(O, .85, .85, 3.6, frost, x, 2.0, 0, 0, 0, 0, 24); for (const y of [.8, 1.8, 2.8]) cyl(O, .88, .88, .12, steel, x, y, 0, 0, 0, 0, 24); sph(O, .85, frost, x, 3.8, 0, 1, .4, 1, 24); cyl(O, .16, .16, .4, steel, x, 4.15, 0, 0, 0, 0, 10); bolts(O, [[x, .22, .88], [x + .5, .22, .72]], .03); }
    cyl(O, .22, .24, 8.6, paintGrey, 3.4, 4.3, .5, 0, 0, 0, 14); for (let i = 0; i < 5; i++) cyl(O, .245, .245, .45, i % 2 ? red : paint, 3.4, 7.2 + i * .42 - 1.6, .5, 0, 0, 0, 14);   // exhaust stack, red and white bands
    for (const s of [-1, 1]) rod(O, [3.4 + s * .4, .2, .5 + .6], [3.4, 5, .5], .02, steel);
    box(O, 2.6, 1.5, 1.5, paint, 1.2, .9, 1.9); for (let i = 0; i < 6; i++) box(O, 2.5, .02, .02, steel, 1.2, .35 + i * .22, 2.66);   // compressor skid with cooling louvres
    cyl(O, .1, .1, 3.2, green, 0, 3.2, 2.1, 0, 0, Math.PI / 2, 10); for (let i = 0; i < 3; i++) rod(O, [-2.6 + i * 2.2, 3.4, .5], [-1.6 + i * 1.1, 3.2, 2.1], .06, green);
    O.add((() => {
      const L = new THREE.Group(), lx = -3.55, lz = .55; L.position.set(lx, 0, lz);
      for (const s of [-.17, .17]) {
        rod(L, [s, .04, 0], [s, 3.7, 0], .03, yellow);
        box(L, .24, .07, .3, steel, s, .06, 0);
        // Stand-offs run from the ladder to the reactor shell, so the rails are visibly fixed in place.
        const x = lx + s, dx = x + 2.6, dz = lz, n = Math.hypot(dx, dz), contact = [-2.6 + dx / n * .86, 0, dz / n * .86];
        for (const y of [.8, 1.8, 2.8, 3.5]) rod(L, [s, y, 0], [contact[0] - lx, y, contact[2] - lz], .025, steel);
      }
      for (let y = .32; y < 3.7; y += .32) rod(L, [-.17, y, 0], [.17, y, 0], .022, steel);
      for (const s of [-.17, .17]) rod(L, [s, 3.45, 0], [s, 3.95, 0], .03, yellow);
      return L;
    })());
    box(O, 2.55, .78, .07, paintGrey, 1.2, 1.0, 2.68); bolts(O, [[.08, .68, 2.72], [2.32, .68, 2.72], [.08, 1.32, 2.72], [2.32, 1.32, 2.72]], .025, steel);
    sign(O, 'O2 EXTRACTION\nCO2 IN · O2 OUT', 2.4, .6, 1.2, 1.0, 2.73, 0, { bg: '#2e8b57', fg: '#fff', font: 'bold 32px system-ui' });
    sign(O, 'HOT · 800 C', .7, .22, -2.6, 1.2, .9, 0, { bg: '#b3261e', fg: '#fff', font: 'bold 26px system-ui', tape: true });
    sign(O, 'REPLACED SOL 31\nOLD UNIT AT SHED', .7, .26, 2.55, 1.15, 1.9, Math.PI / 2, { bg: '#f2e46a', fg: '#222', font: '15px "Comic Sans MS", cursive' });
    grime(O, 11, 7); colliders.push({ x: cx + 3.2, z: cz - 6.5, r: 4.2, halfX: 4, halfZ: 2.2, object: O });
    // regolith processing: a hopper on legs over a screen, a conveyor to a tailings pile, and a bucket-wheel excavator's spare bucket
    const R = new THREE.Group(); R.position.set(-5.5, 0, 1.4); Y.add(R);
    for (const [x, z] of [[-.9, -.9], [.9, -.9], [-.9, .9], [.9, .9]]) rod(R, [x * 1.1, 0, z * 1.1], [x * .75, 2.2, z * .75], .06, paintGrey);
    cyl(R, 1.3, .35, 1.7, rust, 0, 3.0, 0, 0, 0, 0, 20); box(R, 2.7, .08, 2.7, steel, 0, 3.9, 0); box(R, 1.6, 1.0, 1.4, paint, 0, 1.55, 0);   // hopper over the screening housing
    const belt = box(R, .7, .12, 6.4, black, 0, 1.2, 3.4, -.18, 0, 0); box(R, .78, .06, 6.5, yellow, 0, 1.12, 3.4, -.18, 0, 0); for (let i = 0; i < 7; i++) rod(R, [-.38, 0, 1.2 + i * .9], [-.38, 1.0 - i * .13, 1.2 + i * .9], .03, steel);
    sph(R, 1, regolith, 0, .15, 6.9, 1.9, .9, 1.8, 14).receiveShadow = true;   // tailings pile under the belt end
    sign(R, 'REGOLITH FEED\nMAX 2 t / h', 1.2, .4, 0, 1.55, .72, 0, { bg: '#e8b923', fg: '#161616', font: 'bold 24px system-ui' });
    grime(R, 6, 8, 0, 3);
    colliders.push({ x: cx - 5.5, z: cz + 1.4, r: 2, object: R });
    // water extraction: a drill derrick (heated sleeve down into the ice), winch, hose to the ice tanks
    const W = new THREE.Group(); W.position.set(4.8, 0, 1.4); Y.add(W);
    for (const [x, z] of [[-.8, -.8], [.8, -.8], [.8, .8], [-.8, .8]]) rod(W, [x, 0, z], [x * .22, 6.8, z * .22], .06, paintGrey);
    for (let i = 1; i <= 5; i++) { const t = i / 6, r = .8 * (1 - t) + .18 * t, y = 6.8 * t; for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) rod(W, [a[0] * r, y, a[1] * r], [b[0] * r, y, b[1] * r], .02, steel); }
    cyl(W, .2, .2, 1.0, darkM, 0, 6.7, 0, 0, 0, 0, 10); box(W, .5, .5, .5, paint, 0, 7.15, 0); cyl(W, .08, .08, 6.2, steel, 0, 3.4, 0, 0, 0, 0, 8);   // drive head, drill string
    box(W, 1.6, 1.0, 1.2, paintGrey, 1.9, .6, 0); cyl(W, .4, .4, .9, red, 1.9, 1.5, 0, Math.PI / 2, 0, 0, 16); rod(W, [1.9, 1.5, 0], [0, 6.7, .1], .015, black);   // winch and cable
    cyl(W, .1, .1, 4.8, blue, 1.0, .35, -1.4, 0, 0, Math.PI / 2, 8); box(W, .6, .02, .6, std('ice', '#cfe3ee', { roughness: .4 }), 0, .02, 0);
    box(W, 1.3, .58, .06, paintGrey, 1.9, .66, .64); bolts(W, [[1.38, .44, .68], [2.42, .44, .68], [1.38, .88, .68], [2.42, .88, .68]], .018, steel);
    sign(W, 'ICE DRILL 1\nHEAT ON · KEEP OUT', 1.18, .42, 1.9, .66, .68, 0, { bg: '#2f64b5', fg: '#fff', font: 'bold 24px system-ui' });
    sign(W, 'TOOLS → SHED', .5, .16, 1.9, .2, .68, 0, { bg: '#f2e46a', fg: '#222', font: '16px "Comic Sans MS", cursive' });
    grime(W, 5, 5, .6, 0); colliders.push({ x: cx + 4.8, z: cz + 1.4, r: 2.2, object: W });
    // ice storage: three horizontal tanks on saddles, frosted, with a walkway ladder
    const T = new THREE.Group(); T.position.set(-4.2, 0, 8.2); Y.add(T);
    for (let i = 0; i < 3; i++) { const z = (i - 1) * 2.7; cyl(T, 1.1, 1.1, 5.8, frost, 0, 1.3, z, 0, 0, Math.PI / 2, 28); for (const x of [-2.9, 2.9]) sph(T, 1.1, frost, x, 1.3, z, .3, 1, 1, 18); for (const x of [-1.8, 0, 1.8]) box(T, .4, 1.1, 1.6, paintGrey, x, .5, z);
      for (const x of [-1.8, 0, 1.8]) cyl(T, 1.12, 1.12, .12, steel, x, 1.3, z, 0, 0, Math.PI / 2, 28); cyl(T, .22, .22, .2, steel, .6, 2.45, z, 0, 0, 0, 12); }
    box(T, 7.4, .05, 6.8, steel, 0, 2.55, 0);   // continuous service deck over the three vessel saddles
    handrail(T, -3.6, -3.4, -3.6, 3.4, 3.55); handrail(T, 3.6, -3.4, 3.6, 3.4, 3.55);
    // Fixed access ladder at the south end: feet rest on the slab and the rails overlap the deck edge.
    for (const x of [-.42, .42]) { rod(T, [x, .04, 4.5], [x, 2.95, 3.05], .035, yellow); rod(T, [x, 2.6, 3.4], [x, 3.3, 3.14], .035, yellow); }
    for (let y = .32; y <= 2.6; y += .32) { const z = 4.5 - (y - .04) * (1.45 / 2.91); rod(T, [-.42, y, z], [.42, y, z], .025, steel); }
    for (const x of [-.42, .42]) { box(T, .16, .06, .22, darkM, x, .06, 4.5); rod(T, [x, 2.52, 3.46], [x * .92, 2.45, 3.25], .025, steel); }
    // Tank identity is bolted to the exposed end cap instead of hovering in front of the row.
    sign(T, 'H2O ICE · 40 t\n-20 C · SEALED', 1.65, .48, -3.26, 1.3, -2.7, -Math.PI / 2, { bg: '#1c3340', fg: '#e9f4ef', font: 'bold 25px system-ui' });
    grime(T, 8.5, 10.5); colliders.push(meshCollider(T));
    // fuel production: Sabatier reactor column with heat exchanger, two cryo spheres (O2 and CH4) on leg frames, a flare stack
    const F = new THREE.Group(); F.position.set(4.6, 0, 8.4); Y.add(F);
    cyl(F, .75, .75, 5.2, paint, -1.4, 2.7, -1.6, 0, 0, 0, 24); for (const y of [1, 2.2, 3.4, 4.6]) cyl(F, .79, .79, .1, steel, -1.4, y, -1.6, 0, 0, 0, 24); sph(F, .75, paint, -1.4, 5.3, -1.6, 1, .5, 1, 24);
    box(F, 1.2, 1.6, 1.2, paintGrey, 1.0, .85, -1.6); for (let i = 0; i < 8; i++) cyl(F, .04, .04, 1.1, steel, .6 + i * .115, 1.9, -1.6, 0, 0, 0, 6); rod(F, [-.7, 3.8, -1.6], [.6, 1.9, -1.6], .07, blue);
    for (const [x, col, name] of [[-1.7, '#9fd5ff', 'LOX'], [1.9, '#ffd27a', 'CH4']]) { const s = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 20), std('cryo' + name, '#eef3f6', { roughness: .35, metalness: .4 })); s.position.set(x, 3.0, 1.9); s.castShadow = true; F.add(s);
      cyl(F, 1.53, 1.53, .1, std('cryoBand' + name, col, { roughness: .5 }), x, 3.0, 1.9, 0, 0, 0, 32); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; rod(F, [x + Math.cos(a) * 1.0, 0, 1.9 + Math.sin(a) * 1.0], [x + Math.cos(a) * 1.15, 2.1, 1.9 + Math.sin(a) * 1.15], .06, paintGrey); }
      cyl(F, 1.0, 1.0, .1, steel, x, .85, 1.9, 0, 0, 0, 20); sign(F, name + (name === 'LOX' ? '\n-183 C' : '\n-161 C'), .9, .5, x, 3.0, 1.9 + 1.52, 0, { bg: '#1c3340', fg: '#e9f4ef', font: 'bold 34px system-ui' }); }
    cyl(F, .1, .14, 9, paintGrey, 3.5, 4.5, -1.8, 0, 0, 0, 10); cyl(F, .2, .08, .4, darkM, 3.5, 9.1, -1.8, 0, 0, 0, 10); const flame = new THREE.Mesh(new THREE.ConeGeometry(.16, .55, 8), new THREE.MeshBasicMaterial({ color: '#ffb24a', transparent: true, opacity: .9 })); flame.position.set(3.5, 9.55, -1.8); F.add(flame); live.push(flame); flame.onBeforeRender = () => { const t = performance.now() * .01; flame.scale.set(1 + Math.sin(t) * .1, 1 + Math.sin(t * 1.7) * .25, 1 + Math.cos(t) * .1); };
    box(F, 2.25, .72, .07, paintGrey, 1, 1.2, -.96); bolts(F, [[-.02, .9, -.91], [2.02, .9, -.91], [-.02, 1.5, -.91], [2.02, 1.5, -.91]], .022, steel);
    sign(F, 'FUEL PLANT\nCH4 + O2 · NO FLAMES', 2.1, .56, 1, 1.2, -.91, 0, { bg: '#b3261e', fg: '#fff', font: 'bold 28px system-ui', tape: true });
    grime(F, 10, 9, 1, 0); colliders.push(meshCollider(F));
    // pipe rack tying it all together: four coloured lines on a frame, with a cable tray and valve wheels
    const P = new THREE.Group(); P.position.set(0.3, 0, 4.6); Y.add(P);
    for (let x = -8; x <= 8; x += 2.8) { box(P, .12, 2.4, .12, paintGrey, x, 1.2, 0); box(P, .12, .12, 1.4, paintGrey, x, 2.4, 0); }
    [[blue, -.5], [green, -.17], [yellow, .17], [red, .5]].forEach(([m, z]) => cyl(P, .07, .07, 17, m, 0, 2.5, z, 0, 0, Math.PI / 2, 10));
    box(P, 17, .05, .5, steel, 0, 2.22, 0); for (const x of [-5, 3.6]) { cyl(P, .2, .015, .03, red, x, 2.9, -.5, 0, 0, 0, 12).rotation.x = Math.PI / 2; }
    for (const [x, t] of [[-6, 'WATER'], [-1.5, 'O2'], [2.5, 'CH4'], [6.5, 'FIRE']]) {
      for (const dx of [-.18, .18]) rod(P, [x + dx, 2.25, .22], [x + dx, 2.54, .68], .012, steel);
      sign(P, t, .5, .14, x, 2.62, .71, 0, { w: 128, h: 40, bg: '#f4f1e8', font: 'bold 24px monospace' });
    }
    colliders.push(meshCollider(P));
    // shielding blocks: palletised polyethylene and regolith-brick stacks waiting to be placed
    const B = new THREE.Group(); B.position.set(7.2, 0, 4.0); Y.add(B);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4 - (r >> 1); c++) { const m = (r + c) % 3 ? std('blockWhite', '#e6e3dc', { roughness: .7 }) : regolith; const b = box(B, .96, .46, .48, m, (c - 1.6 + (r & 1) * .5) * 1.0, .55 + r * .47, 0); if (r === 3 && c === 0) { b.rotation.y = .12; b.position.x += .08; } }
    box(B, 4.4, .14, .7, rust, 0, .07, 0);
    sign(B, 'SHIELDING\nCLASS B · 1 m', .9, .4, 0, .42, .27, 0, { bg: '#f4f1e8', font: 'bold 22px system-ui' });
    colliders.push({ x: cx + 7.2, z: cz + 4, r: 2.2, halfX: 2.2, halfZ: .5, object: B });
    // yard floodlights at the corners
    for (const [x, z] of [[-8, -9], [8, -9], [-8, 9.5], [8, 9.5]]) { const m = floodMast(cx + x, cz + z, 8, 0); }
    const yardGate = supportedSign(Y, 'ISRU YARD\nAUTHORISED ONLY', 1.6, .54, 0, 1.65, -8.7, Math.PI, { bg: '#e8b923', fg: '#161616', font: 'bold 25px system-ui' });
    colliders.push({ x: cx, z: cz - 8.7, r: .98, halfX: .9, halfZ: .16, object: yardGate });
    // utility trench from the yard to the last module: a covered channel of grating plates with a cable tray inside
    const pts = [[cx - 8, cz - 6.6], [last.x + 7, last.z + 2.4], [last.x + 4.6, last.z + 2.4]], tr = new THREE.Group(); root.add(tr);
    for (let s = 0; s < pts.length - 1; s++) { const [x0, z0] = pts[s], [x1, z1] = pts[s + 1], len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
      for (let d = 0; d < len; d += 1.2) { const t = (d + .6) / len, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, g = new THREE.Mesh(new THREE.BoxGeometry(.9, .06, 1.15), d % 2.4 < 1.2 ? steel : paintGrey); g.position.set(x, ground(x, z) + .05, z); g.rotation.y = a; g.receiveShadow = true; tr.add(g); const l = new THREE.Mesh(new THREE.BoxGeometry(1.0, .07, .05), yellow); l.position.set(x, ground(x, z) + .055, z - 0); l.rotation.y = a; tr.add(l); } }
    root.add(Y);
    // berm wall: a long regolith bank behind the yard (north and east) so a blast or a dust storm takes the berm first
    const berm = new THREE.Group(); root.add(berm);
    for (let i = 0; i <= 26; i++) {
      const a = -Math.PI * .62 + i / 26 * Math.PI * 1.2, rr = 15.5 + Math.sin(i * 1.7) * .5;
      const x = cx + Math.cos(a) * rr * .95, z = cz + Math.sin(a) * rr * 1.05;
      if (z > cz + 3) continue;
      const g = sph(berm, 1, i % 4 === 0 ? regolithDark : regolith, x, ground(x, z), z,
        2.7 + rnd() * .4, 1.3 + rnd() * .35, 2.7 + rnd() * .4, 12);
      // A soil bank tapers into the ground, unlike a sphere's vertical rim.
      const vertices = g.geometry.attributes.position;
      for (let j = 0; j < vertices.count; j++) vertices.setY(j, Math.max(0, vertices.getY(j)) ** 2);
      vertices.needsUpdate = true; g.geometry.computeVertexNormals();
      g.rotation.y = rnd() * 3; g.receiveShadow = true; g.name = 'walkable-isru-berm';
      colliders.push({ x, z, r: 3.2, object: g, driveOver: true, surfaceContact: createRockContact(g) });
    }
  }

  // ====================================================================================================
  // 5. STORM SHELTER and RADIATION REFUGE: a buried module under a regolith mound with a hatch and vents
  // ====================================================================================================
  {
    const mid = layout.moduleColliders[2], sx = mid.x - 14, sz = mid.z - 17, S = new THREE.Group();
    const top = slab(sx, sz + 3.6, 4.4, 3.6); place(S, sx, sz, 0, top - .3);
    const mound = sph(S, 1, regolith, 0, 0, 0, 6.2, 2.3, 5.4, 36); mound.receiveShadow = true;
    for (let i = 0; i < 14; i++) { const a = rnd() * TAU, r = 3 + rnd() * 2.6, b = sph(S, .5 + rnd() * .4, regolithDark, Math.cos(a) * r, .1, Math.sin(a) * r * .9, 1.2, .5, 1, 8); b.rotation.y = rnd() * 3; }   // loose rocks on the mound
    // entrance: a concrete portal cut into the mound, a steel hatch, steps, a handrail and a lamp
    const portal = new THREE.Group(); portal.position.set(0, 0, 4.4); S.add(portal);
    box(portal, 3.2, 3.0, .6, concrete, 0, 1.7, 0); box(portal, 1.5, 2.2, .1, darkM, 0, 1.4, .33); box(portal, 1.7, 2.35, .06, steel, 0, 1.4, .3);
    cyl(portal, .14, .14, .05, glowRed, .55, 1.9, .38, Math.PI / 2, 0, 0, 16); box(portal, .1, .5, .1, steel, -.5, 1.4, .4);
    box(portal, 2.4, .3, .6, regolith, 0, 3.2, -.2); box(portal, 1.8, .45, .2, std('sheltBoard', '#1c3340'), 0, 3.0, .3);
    sign(portal, 'STORM SHELTER\nRADIATION REFUGE', 2.6, .6, 0, 3.0, .42, 0, { bg: '#1c3340', fg: '#ffd27a', font: 'bold 30px system-ui' });
    sign(portal, 'SUIT UP · LOG IN · 14 SOLS WATER', 1.6, .28, 0, 2.55, .36, 0, { bg: '#f4f1e8', font: 'bold 20px system-ui' });
    sign(portal, 'TEMP: LEAK AT\nVENT 2 - TAPED', .6, .3, -1.05, .75, .35, 0, { bg: '#f2e46a', fg: '#222', font: '15px "Comic Sans MS", cursive' });
    for (let i = 0; i < 5; i++) box(portal, 2.4, .2, .5, i % 2 ? paintGrey : steel, 0, .1 + i * 0.0, 1.0 + i * .5, 0, 0, 0).position.y = .1 - i * 0.0;
    handrail(portal, -1.4, .6, -1.4, 3.2, 1.0); handrail(portal, 1.4, .6, 1.4, 3.2, 1.0);
    const lamp = box(portal, .3, .2, .15, darkM, 0, 3.55, .45); box(portal, .24, .14, .02, glowWhite, 0, 3.55, .53);
    // vents and an emergency beacon poking up through the mound, with a rain-cap on each
    for (const [x, z, h] of [[-1.6, -1.2, 1.4], [1.7, -.6, 1.1], [0, -2.4, 1.8]]) { cyl(S, .22, .22, h, paintGrey, x, 2.1 + h / 2 - .4, z, 0, 0, 0, 12); cyl(S, .32, .22, .15, steel, x, 2.1 + h - .3, z, 0, 0, 0, 12); }
    cyl(S, .05, .05, 3.2, steel, 2.4, 3.2, -1.4, 0, 0, 0, 8); sph(S, .18, glowRed, 2.4, 4.9, -1.4); sph(S, .06, glowWhite, 2.4, 4.75, -1.4);
    const beacon = S.children[S.children.length - 2]; live.push(beacon); beacon.onBeforeRender = () => { beacon.visible = (performance.now() % 1600) < 260; };
    cyl(S, .05, .05, 2.4, black, -2.6, 3.0, -1.0, 0, 0, 0, 6);
    grime(S, 14, 12, 0, 1.5, .02); colliders.push({ x: sx, z: sz, r: 5.2, object: mound });
    // spare shielding block stack beside the portal
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) box(S, .96, .46, .48, (r + c) % 2 ? std('blockWhite', '#e6e3dc', { roughness: .7 }) : regolith, 3.6 + c * 1.0 + r * .5, .25 + r * .47, 5.4);
  }

  // ---- storms: paint and steel pick up fine tan dust (mostly on upward faces) while world.stormDust is high, and clear again ----
  // Real Mars dust settles on every horizontal surface and takes sols of weather or a cleaning crew to remove. This is purely visual
  // and follows the same storm value that dims the solar panels; the shielding-level tint in settlement.js is a separate gameplay signal.
  const stormU = { value: 0 };
  const dustable = m => {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = function (shader, renderer) {
      prev?.call(this, shader, renderer); shader.uniforms.kitStorm = stormU;
      shader.vertexShader = 'varying float vKitUp;\n' + shader.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvKitUp = objectNormal.y;');
      shader.fragmentShader = 'uniform float kitStorm; varying float vKitUp;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n float kd = kitStorm * (.3 + .6 * smoothstep(.15, .95, vKitUp)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.56, .37, .25), kd);');
    };
    m.customProgramCacheKey = () => 'kit-storm-v1'; m.needsUpdate = true;
  };
  for (const m of Object.values(matCache)) if (m.isMeshStandardMaterial && !m.transparent) dustable(m);
  const prevBefore = scene.onBeforeRender;
  let lastT = performance.now();
  scene.onBeforeRender = function (...args) { const now = performance.now(), dt = Math.min(1, (now - lastT) / 1000); lastT = now; const target = root.userData.forceStorm ?? Math.min(1, world.stormDust || 0); stormU.value += (target - stormU.value) * (1 - Math.exp(-dt * 1.2)); prevBefore?.apply(this, args); };

  // ---- finish: merge every static part per material; moving parts (anemometer, vane, beacon, flare) stay whole ----
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.castShadow ?? true; } });
  root.updateMatrixWorld(true);
  const saved = mergeStatic(root, { exclude: live });
  return { root, saved };
}
