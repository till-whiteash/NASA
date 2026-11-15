import * as THREE from 'three';
import { loadModel } from './nasamodels.js';
import { fillCrewSlots, LOOKS, BASE } from './cinematic.js';

// The Ares VI briefing room as a place you can walk around after Director Hale's briefing: get up from your seat,
// look at the hologram and the mission screens, talk to the crew, then press "Ready for launch" (right side) to go
// to the launch pad. Resolves when the player is ready. Same room, crew and lighting as the ares_vi_briefing film.
// Controls: WASD / arrow keys to walk, Shift to hurry, drag to look; on touch, the pad bottom-left walks.
const ROOM_R = 7.2, EYE = 1.62;
const OBSTACLES = [
  { x: 0, z: 0, r: 1.45 },                                                     // hologram table
  { x: 0, z: -2.3, r: .55 },                                                   // Director Hale
  ...[-2.4, -.8, .8, 2.4].map(x => ({ x, z: 2.6, r: .35 })),                   // crew chairs
];
const AT = { hale: { x: 0, z: -2.3, r: 2.1 }, holo: { x: 0, z: 0, r: 3.0 }, screens: { x: 0, z: -7.2, r: 2.6 }, mei: { x: -2.4, z: 2.6, r: 1.5 }, medic: { x: 2.4, z: 2.6, r: 1.5 }, eng: { x: .8, z: 2.6, r: 1.5 } };
const LINES = {                                                                // what you hear when you walk up to things
  mars: {
    hale: 'Director Hale: "Six months to Mars, twenty-six months to build. Check your suit seals twice, Engineer."',
    holo: 'Mars hologram: your landing zone, the habitat, solar field, fission unit and ISRU plant that makes oxygen and fuel.',
    screens: 'Mission screens: real NASA images of Mars - the ground you will build on.',
    mei: 'Mei Lin, commander: "Strap in tight on launch day. The first two minutes are the loudest of your life."',
    medic: 'Medic: "Mars gravity is 38% of Earth\'s. Keep exercising on the trip, or your bones will notice."',
    eng: 'Engineer 3: "The power trade-off is everything out there. Every watt counts."',
  },
  moon: {
    hale: 'Director Hale: "Four days out, a week on the surface. The south pole has never had visitors, Engineer. Be the first."',
    holo: 'Moon hologram: the south pole landing zone, the solar mast on the sunlit ridge and the dark craters that hold ice.',
    screens: 'Mission screens: real NASA images - Artemis I, the Moon\'s far side, polar ice and Earth setting over the Moon.',
    mei: 'Mei Lin, commander: "No air on the Moon, so no parachutes. The lander\'s engine does all the braking."',
    medic: 'Medic: "Lunar gravity is one sixth of Earth\'s. You\'ll bounce more than you walk."',
    eng: 'Engineer 3: "Lunar nights last two weeks. Our power has to last that long without the Sun."',
  },
};

export function walkBriefingRoom({ destination = 'mars' } = {}) {
  const SPOTS = Object.entries(AT).map(([k, at]) => ({ ...at, text: LINES[destination === 'moon' ? 'moon' : 'mars'][k] }));
  return new Promise(resolve => {
    const box = document.createElement('section'); box.className = 'briefing-walk'; box.setAttribute('aria-label', 'Briefing room');
    box.innerHTML = `<canvas></canvas>
      <div class="bw-help"><b>Briefing room</b><span>Walk with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys · drag to look around</span></div>
      <p class="bw-tip" aria-live="polite"></p>
      <button type="button" class="bw-ready"><small>When you're done looking around</small>Ready for launch <span aria-hidden="true">›</span></button>
      <div class="bw-pad" aria-hidden="true"><i></i></div>
      <p class="bw-load">Loading the briefing room…</p>`;
    document.body.append(box);
    const canvas = box.querySelector('canvas'), tip = box.querySelector('.bw-tip');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const look = LOOKS.room, scene = new THREE.Scene(); scene.background = new THREE.Color(look.bg);
    scene.add(new THREE.HemisphereLight(look.sky, look.ground, look.hemi + .25));
    const sun = new THREE.DirectionalLight('#ffffff', look.sunI); sun.position.set(-3, 6, 4); scene.add(sun);
    const glow = new THREE.PointLight('#ff7a3d', 6, 9, 1.5); glow.position.set(0, 1.6, 0); scene.add(glow);
    const key = new THREE.SpotLight('#ffffff', 40, 20, .8, .5, 1.5); key.position.set(0, 6, 3); scene.add(key);
    const cam = new THREE.PerspectiveCamera(70, 1, .05, 100);
    const pos = new THREE.Vector3(-1.6, EYE, 3.8); let yaw = Math.PI - .3, pitch = -.08;   // standing up in the aisle beside your seat, facing the hologram
    const keys = {}, pad = { x: 0, y: 0 }, mixers = [];
    let raf = 0, done = false, last = performance.now(), mixer = null;

    loadModel(BASE + (destination === 'moon' ? 'ares_vi_briefing_moon' : 'ares_vi_briefing') + '.glb').then(async gltf => {
      if (done || !gltf) return;
      const root = gltf.scene.clone(true); scene.add(root);
      root.traverse(o => { if (o.isCamera || /^tag_/.test(o.name)) o.visible = false; });   // name tags face the film camera; from behind they read backwards
      await fillCrewSlots(root, mixers).catch(e => console.warn('Crew could not load:', e));
      // you got up: your seat (YOU · ENGINEER 2, the chair at x = -0.8) is empty now
      root.updateMatrixWorld(true);
      root.traverse(o => { if (o.userData?.crew_char && /crew/.test(o.name)) { const p = o.getWorldPosition(new THREE.Vector3()); if (Math.abs(p.x + .8) < .5 && p.z > 1.5) o.visible = false; } });
      const clip = gltf.animations[0];
      if (clip) { mixer = new THREE.AnimationMixer(root); const a = mixer.clipAction(clip); a.setLoop(THREE.LoopRepeat, Infinity); a.play(); a.time = clip.duration * .5; }
      box.querySelector('.bw-load')?.remove();
    }).catch(e => { console.warn('Briefing room unavailable:', e); finish(); });

    // ---- input
    const onKey = down => e => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) { keys[e.code] = down; e.preventDefault(); e.stopPropagation(); }
    };
    const kd = onKey(true), ku = onKey(false);
    addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      yaw -= (e.clientX - drag.x) * .0045; pitch = Math.max(-1.1, Math.min(1.1, pitch - (e.clientY - drag.y) * .0035));
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const endDrag = e => { if (drag?.id === e.pointerId) drag = null; };
    canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
    const padEl = box.querySelector('.bw-pad'), knob = padEl.querySelector('i');
    let padId = null;
    const padMove = e => { const r = padEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
      let x = (e.clientX - cx) / R, y = (e.clientY - cy) / R; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      pad.x = x; pad.y = y; knob.style.transform = `translate(${x * R * .6}px, ${y * R * .6}px)`; };
    padEl.addEventListener('pointerdown', e => { padId = e.pointerId; padEl.setPointerCapture(e.pointerId); padMove(e); });
    padEl.addEventListener('pointermove', e => { if (e.pointerId === padId) padMove(e); });
    const padEnd = e => { if (e.pointerId !== padId) return; padId = null; pad.x = pad.y = 0; knob.style.transform = ''; };
    padEl.addEventListener('pointerup', padEnd); padEl.addEventListener('pointercancel', padEnd);

    const finish = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true);
      renderer.dispose(); renderer.forceContextLoss?.();
      box.classList.add('bw-out'); setTimeout(() => box.remove(), 400);
      resolve(true);
    };
    box.querySelector('.bw-ready').onclick = finish;

    // ---- walking, kept inside the round room and out of the table, chairs and people
    const collide = p => {
      const d = Math.hypot(p.x, p.z); if (d > ROOM_R) { p.x *= ROOM_R / d; p.z *= ROOM_R / d; }
      for (const o of OBSTACLES) { const dx = p.x - o.x, dz = p.z - o.z, l = Math.hypot(dx, dz); if (l < o.r + .3) { const k = (o.r + .3) / (l || 1); p.x = o.x + dx * k; p.z = o.z + dz * k; } }
    };
    let bob = 0, lastTip = '';
    const tick = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - pad.y;
      let s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + pad.x;
      if (keys.ArrowLeft) yaw += dt * 2; if (keys.ArrowRight) yaw -= dt * 2;
      const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
      const speed = (keys.ShiftLeft || keys.ShiftRight ? 3.2 : 1.9) * dt;
      if (l > .05) {
        pos.x += (Math.sin(yaw) * f - Math.cos(yaw) * s) * speed; pos.z += (Math.cos(yaw) * f + Math.sin(yaw) * s) * speed;
        collide(pos); bob += dt * 9;
      }
      cam.position.set(pos.x, EYE + Math.sin(bob) * .025, pos.z);
      cam.lookAt(pos.x + Math.sin(yaw) * Math.cos(pitch), EYE + Math.sin(pitch), pos.z + Math.cos(yaw) * Math.cos(pitch));
      const near = SPOTS.find(sp => Math.hypot(pos.x - sp.x, pos.z - sp.z) < sp.r)?.text || '';
      if (near !== lastTip) { lastTip = near; tip.textContent = near; tip.classList.toggle('on', !!near); }
      mixer?.update(dt); for (const m of mixers) m.update(dt);
      const w = box.clientWidth || innerWidth, h = box.clientHeight || innerHeight;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      renderer.render(scene, cam);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
