import * as THREE from 'three';
import { loadModel } from './nasamodels.js';
import { PRINTABLE, FROM_EARTH, powerLearn, canPrint, printPart, recycleSample } from './power-tutorial-state.js';

// The outpost's 3D printer. Each part prints layer by layer: the real part model rises out of the heated bed under a
// moving print head (a clipping plane reveals it from the bottom up). Printing costs feedstock: the lander brought a
// starter spool, and a mineral sample from the store can be melted into more.
export function openFabricator({ outpost, store, save, need = [] } = {}) {
  return new Promise(resolve => {
    const L = powerLearn(outpost);
    const el = document.createElement('section'); el.className = 'fabricator'; el.setAttribute('aria-label', '3D printer');
    el.innerHTML = `<canvas></canvas>
      <aside class="fab-panel"><p class="cl-kicker">3D printer · outpost workshop</p><h2>Print the power parts</h2>
        <p class="fab-intro">The printer melts feedstock and lays it down one thin layer at a time, building a part from the bottom up. On Mars, printing spares here is faster than waiting months for a supply ship.</p>
        <p class="fab-feed"></p><div class="fab-list"></div>
        <p class="fab-earth"><b>From Earth:</b> ${Object.entries(FROM_EARTH).map(([k, v]) => `${k}: ${v}`).join(' ')} Printers can't make computer chips or battery chemistry yet.</p>
        <div class="cl-actions"><button type="button" class="fab-recycle">♻ Recycle a mineral sample (+3 feedstock)</button><button type="button" class="fab-all">Print everything needed</button></div>
        <p class="cl-feedback fab-msg" aria-live="polite"></p></aside>
      <button type="button" class="cl-close">Done</button>`;
    document.body.append(el);
    const $ = s => el.querySelector(s), canvas = $('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#10151b');
    scene.add(new THREE.HemisphereLight('#e8f0ff', '#2a2018', 1.2)); const key = new THREE.DirectionalLight('#fff', 2.2); key.position.set(2, 5, 3); scene.add(key);
    const cam = new THREE.PerspectiveCamera(36, 1, .05, 30); cam.position.set(.9, 1.0, 1.35); cam.lookAt(0, .25, 0);
    const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? .5, metalness: o.m ?? 0, emissive: o.e ?? '#000', emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.t ?? 1 });
    // the printer: aluminium frame, heated bed, gantry and print head
    const alu = M('#aeb6bd', { r: .35, m: .8 });
    for (const x of [-.36, .36]) for (const z of [-.3, .3]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.03, .7, .03), alu); p.position.set(x, .35, z); scene.add(p); }
    for (const y of [.02, .69]) for (const [w, d, x, z] of [[.75, .03, 0, -.3], [.75, .03, 0, .3], [.03, .63, -.36, 0], [.03, .63, .36, 0]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, .03, d), alu); r.position.set(x, y, z); scene.add(r); }
    const bed = new THREE.Mesh(new THREE.BoxGeometry(.56, .02, .48), M('#20262c', { r: .3 })); bed.position.y = .12; scene.add(bed);
    const bedHeat = new THREE.Mesh(new THREE.PlaneGeometry(.5, .42), new THREE.MeshBasicMaterial({ color: '#ff6a2a', transparent: true, opacity: .15 })); bedHeat.rotation.x = -Math.PI / 2; bedHeat.position.y = .131; scene.add(bedHeat);
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(.72, .03, .04), alu); scene.add(gantry);
    const head = new THREE.Group(); scene.add(head);
    head.add(new THREE.Mesh(new THREE.BoxGeometry(.07, .08, .07), M('#ff7a2f', { r: .4 })));
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(.012, .03, 10), M('#d4a54a', { m: 1, r: .3 })); nozzle.rotation.x = Math.PI; nozzle.position.y = -.055; head.add(nozzle);
    const tip = new THREE.PointLight('#ffb36a', 0, .4, 2); tip.position.y = -.07; head.add(tip);
    const spool = new THREE.Mesh(new THREE.TorusGeometry(.09, .035, 10, 28), M('#3a9ad6', { r: .6 })); spool.position.set(.48, .55, 0); spool.rotation.y = Math.PI / 2; scene.add(spool);
    let part = null, job = null, raf = 0, last = performance.now();
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), .13);
    const showPart = async name => {
      const g = await loadModel('power/' + PRINTABLE[name].model + '.glb'); if (!g || job?.name !== name) return null;
      if (part) { scene.remove(part); part = null; }
      const o = g.scene.clone(true), b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), k = .34 / Math.max(s.x, s.y, s.z);
      o.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(o), c = b2.getCenter(new THREE.Vector3()); o.position.set(-c.x, .131 - b2.min.y, -c.z);
      o.traverse(m => { if (m.isMesh) m.material = [].concat(m.material).map(mt => { const x = mt.clone(); x.clippingPlanes = [plane]; x.clipShadows = true; return x; }).at(0); });
      scene.add(o); part = o; return new THREE.Box3().setFromObject(o);
    };
    const render = () => {
      $('.fab-feed').innerHTML = `Feedstock: <b>${L.feed}</b> units`;
      $('.fab-list').innerHTML = Object.entries(PRINTABLE).map(([n, p]) => {
        const done = L.printed.includes(n), needed = need.includes(n), c = canPrint(outpost, n);
        return `<button type="button" data-part="${n}" ${done || !c.ok || job ? 'disabled' : ''} class="${needed && !done ? 'needed' : ''}"><span><b>${done ? '✅ ' : needed ? '● ' : ''}${n}</b><small>${p.what}</small></span><em>${done ? 'printed' : `${p.feed} feed · ${p.secs}s`}</em></button>`;
      }).join('');
      el.querySelectorAll('[data-part]').forEach(b => b.onclick = () => start(b.dataset.part));
      $('.fab-all').disabled = !!job || !need.some(n => !L.printed.includes(n));
    };
    const msg = (t, k = '') => { const m = $('.fab-msg'); m.innerHTML = t; m.className = 'cl-feedback fab-msg ' + k; };
    const queue = [];
    const start = async name => {
      const c = canPrint(outpost, name); if (!c.ok) { msg(c.why, 'bad'); return; }
      // print progress never waits for the model download: a stand-in block prints until the real part arrives
      if (part) { scene.remove(part); part = null; }
      const stand = new THREE.Mesh(new THREE.BoxGeometry(.22, .1, .16), new THREE.MeshStandardMaterial({ color: '#cfd6dc', roughness: .5, clippingPlanes: [plane] })); stand.position.y = .181; scene.add(stand); part = stand;
      const me = job = { name, t: 0, born: performance.now(), secs: PRINTABLE[name].secs, box: new THREE.Box3().setFromObject(stand) }; render(); msg(`Printing <b>${name}</b>… the nozzle lays down one 0.2 mm layer at a time.`);
      showPart(name).then(box => { if (box && job === me) me.box = box; else if (box && job !== me && part) { /* finished already: keep the real part on the bed */ } });
    };
    $('.fab-all').onclick = () => { queue.push(...need.filter(n => !L.printed.includes(n))); if (!job && queue.length) start(queue.shift()); };
    $('.fab-recycle').onclick = () => { const ore = recycleSample(outpost, store); msg(ore ? `Melted one ${ore} sample into 3 units of feedstock.` : 'No mineral samples in the store. Mine some outside and unload them at the locker.', ore ? 'good' : 'bad'); save?.(); render(); };
    const finish = () => { cancelAnimationFrame(raf); renderer.dispose(); renderer.forceContextLoss?.(); el.classList.add('cl-out'); setTimeout(() => el.remove(), 350); removeEventListener('resize', size); resolve(L.printed.slice()); };
    $('.cl-close').onclick = finish;
    const size = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h;
      const pw = w > 760 ? $('.fab-panel').offsetWidth + 16 : 0; if (pw) cam.setViewOffset(w, h, -pw / 2, 0, w, h); else cam.clearViewOffset(); cam.updateProjectionMatrix(); };
    addEventListener('resize', size); size();
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (job && job.box) {
        job.t = (now - job.born) / 1000 / job.secs; const k = Math.min(1, job.t),   // wall-clock: same print time at any frame rate
        b = job.box, y = b.min.y + (b.max.y - b.min.y) * k;
        plane.constant = y;                                               // reveal everything below the current layer
        const zig = Math.sin(now / 90) * .5 + .5, row = Math.sin(now / 900);
        head.position.set(THREE.MathUtils.lerp(b.min.x, b.max.x, zig), y + .07, THREE.MathUtils.lerp(b.min.z, b.max.z, row * .5 + .5));
        tip.intensity = 1.5; spool.rotation.x += dt * 2;
        if (k >= 1) {
          const name = job.name; printPart(outpost, name); save?.(); job = null; tip.intensity = 0; plane.constant = 10;
          msg(`✓ <b>${name}</b> printed. ${PRINTABLE[name].what}`, 'good'); render();
          if (queue.length) setTimeout(() => start(queue.shift()), 600);
          else if (need.length && need.every(n => L.printed.includes(n))) msg('✓ Every part is printed. Next: the circuit lab at the workbench.', 'good');
        }
      } else head.position.set(.2 * Math.sin(now / 1500), .45, .1);
      gantry.position.set(0, head.position.y + .045, head.position.z);
      renderer.render(scene, cam); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    render(); msg(need.length ? `Needed for the starter power kit: ${need.join(', ')}.` : 'Everything for the starter kit is printed.');
    el.fab = { printAll: () => $('.fab-all').click(), busy: () => !!job || queue.length > 0 };   // for tests
  });
}
