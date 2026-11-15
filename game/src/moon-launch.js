import * as THREE from 'three';
import { loadModel } from './nasamodels.js';

// A historical Apollo lunar launch vehicle; cached asset geometry stays owned by loadModel.
export async function moonLaunchStage(parent) {
  const gltf = await loadModel('nasa/saturn-v-history.glb');
  if (!gltf) throw new Error('Moon launch vehicle unavailable');
  const canvas = document.createElement('canvas'); canvas.className = 'cine-canvas';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  parent.prepend(canvas);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#86afd0');
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 3000);
  scene.add(new THREE.HemisphereLight('#eff7ff', '#63523d', 2));
  const sun = new THREE.DirectionalLight('#fff0cf', 3); sun.position.set(60, 120, 80); scene.add(sun);
  const owned = [];
  const mesh = (geometry, material) => { const m = new THREE.Mesh(geometry, material); owned.push(m); return m; };
  const ground = mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: '#64795a', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.2; scene.add(ground);
  const pad = mesh(new THREE.CylinderGeometry(24, 24, 1, 32), new THREE.MeshStandardMaterial({ color: '#66717b', roughness: .9 }));
  scene.add(pad);
  const flight = new THREE.Group(); scene.add(flight);
  const model = gltf.scene.clone(true); model.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(model);
  model.scale.multiplyScalar(45 / bounds.getSize(new THREE.Vector3()).y);
  model.updateMatrixWorld(true); bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.add(new THREE.Vector3(-center.x, -bounds.min.y + .5, -center.z)); flight.add(model);
  const plume = mesh(new THREE.ConeGeometry(3.3, 24, 24), new THREE.MeshBasicMaterial({ color: '#ffb45b', transparent: true, opacity: .8, depthWrite: false }));
  plume.position.y = -11.5; flight.add(plume);
  const core = mesh(new THREE.ConeGeometry(1.6, 16, 20), new THREE.MeshBasicMaterial({ color: '#fff8d9' }));
  core.position.y = -7.5; flight.add(core);
  // Cone tips sit at the engine; exhaust widens below it.
  const target = new THREE.Vector3(), upperSky = new THREE.Color('#142d50');
  let elapsed = 0, width = 0, height = 0;
  return {
    duration: 24, bars: true,
    lines: [
      { t0: 0, t1: 5, phase: 'APOLLO-STYLE LUNAR DEPARTURE', text: 'Saturn V: the historic Apollo Moon rocket.' },
      { t0: 5, t1: 13, phase: 'LIFTOFF', text: 'Engines firing. The lunar crew begins its journey.' },
      { t0: 13, t1: 24, phase: 'ASCENT', text: 'Climb toward Earth orbit, then set a course for the Moon.' },
    ],
    frame(dt) {
      elapsed += dt;
      const lift = Math.max(0, elapsed - 5);
      flight.position.y = lift * lift * .65;
      flight.position.x = Math.max(0, lift - 7) ** 2 * .18;
      flight.rotation.z = -Math.min(.2, Math.max(0, lift - 7) * .015);
      plume.visible = core.visible = elapsed >= 4;
      plume.scale.y = .9 + Math.sin(elapsed * 45) * .1;
      target.set(flight.position.x, flight.position.y + 23, 0);
      camera.position.set(target.x + 67 + lift * 1.5, target.y + 12, 95 + lift * 2);
      camera.lookAt(target);
      scene.background.set('#86afd0').lerp(upperSky, Math.min(1, lift / 19));
      const w = parent.clientWidth || innerWidth, h = parent.clientHeight || innerHeight;
      if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      renderer.render(scene, camera); return elapsed;
    },
    dispose() { for (const m of owned) { m.geometry.dispose(); m.material.dispose(); } renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); },
  };
}
