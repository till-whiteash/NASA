"""Capture the trailer's gameplay shots from the running game (in-engine, three.js), frame by frame at 24 fps.
Each shot steps the world with world.update(1/24) and renders through its own 1920x1080 camera, so the timing is
exact whatever the GPU speed. Usage: python capture_gameplay.py OUT_DIR [shot ...]  -> OUT_DIR/<shot>.mp4
"""
import sys, base64, subprocess, shutil
from pathlib import Path
from game_session import open_game, sync_playwright

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
WANT = sys.argv[2:] or ['build', 'walk', 'mine', 'landing']

SETUP = """async () => {
  const THREE = await import('three'); const w = game.world;
  const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.toneMapping = w.renderer.toneMapping; r.toneMappingExposure = w.renderer.toneMappingExposure; r.outputColorSpace = w.renderer.outputColorSpace;
  r.shadowMap.enabled = true; r.shadowMap.type = w.renderer.shadowMap.type;
  const cam = new THREE.PerspectiveCamera(42, 16/9, 0.1, 4000);
  window.__T = { THREE, r, cam, canvas, frames: [] };
  w.firstPerson = false; w.hud && (w.hud.visible = false);
  for (let i = 0; i < 24; i++) w.update(1/24, false);
  return true; }"""

SHOTS = {
# Ewan's live Mars landing (src/cutscenes.js playLanding / src/edl.js), stepped through its own timeline
'landing': """async ({start, count}) => {
  const { THREE, r, canvas } = __T; const w = game.world, frames = [];
  if (start === 0) {
    const { playLanding } = await import('./src/cutscenes.js');
    __T.land = playLanding(w, { manual: true }); __T.land.root.style.display = 'none';
    __T.land.setTime(0); for (let i = 0; i < 30; i++) { w.update(1/24, false); await new Promise(res => setTimeout(res, 50)); }   // stream terrain
    const c2 = document.createElement('canvas'); c2.width = 1920; c2.height = 1080; __T.c2 = c2;
  }
  const g = __T.c2.getContext('2d'), cam = w.camera; cam.aspect = 16 / 9;
  for (let f = start; f < Math.min(LEN, start + count); f++) {
    const t = f / 24; __T.land.setTime(t); w.update(1/24, false); cam.aspect = 16 / 9; cam.updateProjectionMatrix();
    r.render(w.scene, cam);
    g.globalAlpha = 1; g.drawImage(canvas, 0, 0);
    const tint = +__T.land.root.querySelector('.cs-tint').style.opacity || 0;    // the cutscene's heat tint layer
    if (tint > 0) { g.globalAlpha = tint; g.fillStyle = '#7a4a2a'; g.fillRect(0, 0, 1920, 1080); g.globalAlpha = 1; }
    frames.push(__T.c2.toDataURL('image/jpeg', 0.93));
    if (f % 24 === 0) await new Promise(res => setTimeout(res, 30));            // let terrain chunks stream in
  }
  if (start + count >= LEN) { __T.land.dispose(); }
  return frames; }""".replace('LEN', '480'),
# "Set a base": the outpost's buildings rise one after another while the camera drifts round the camp
'build': """async ({start, count}) => {
  const { THREE, r, cam, canvas } = __T; const w = game.world, frames = [];
  // every visible building near camp: the outpost group's children plus the habitat row and the work zone
  const near = o => { const b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return false; const c = b.getCenter(new THREE.Vector3()), z = b.getSize(new THREE.Vector3());
    return Math.hypot(c.x - 8, c.z + 12) < 55 && Math.max(z.x, z.z) < 120 && z.y > 0.6; };
  const groups = w.scene.children.filter(o => o.isGroup && o.visible && o !== w.player && !o.getObjectByProperty('isCamera', true) && near(o));
  const pieces = []; for (const g of groups) { if (g.children.length > 4) pieces.push(...g.children.filter(c => c.visible && near(c))); else pieces.push(g); }
  const parts = __T.parts ??= pieces.map(c => ({ c, s: c.scale.clone(), x: c.getWorldPosition(new THREE.Vector3()).x }))
     .sort((a, b) => a.x - b.x);
  const N = 48, back = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  for (let f = start; f < Math.min(N, start + count); f++) {
    parts.forEach((p, i) => { const t0 = 2 + i * 34 / parts.length, t = Math.min(1, Math.max(0, (f - t0) / 7));
      const k = t <= 0 ? 0.0001 : back(t); p.c.scale.set(p.s.x * k, p.s.y * k, p.s.z * k); });
    const u = f / (N - 1), a = 0.95 + 0.22 * u;
    cam.position.set(12 + Math.sin(a) * 56, 24 - 4 * u, -20 + Math.cos(a) * 56); cam.lookAt(6, 2, -16);
    w.update(1/24, false); r.render(w.scene, cam); frames.push(canvas.toDataURL('image/jpeg', 0.93));
  }
  if (start + count >= N) parts.forEach(p => p.c.scale.copy(p.s));
  return frames; }""",
'count': "() => (__T.parts||[]).length",
# "Obtain breathable air": the astronaut walks up to the habitat's airlock stairs, camera tracking alongside
'walk': """async ({start, count}) => {
  const { THREE, r, cam, canvas } = __T; const w = game.world, frames = [], e = w.settlement.entrances[0], p = w.player.position;
  const N = 40, goal = new THREE.Vector3(e.x, 0, e.doorZ + 5.5);
  if (start === 0) { p.set(goal.x + 7, p.y, goal.z + 6); w.vel && w.vel.set(0,0,0); }
  for (let f = start; f < Math.min(N, start + count); f++) {
    w.yaw = Math.atan2(goal.x - p.x, goal.z - p.z); w.keys = { KeyW: true };
    w.update(1/24, true);
    const u = f / (N - 1);
    cam.position.set(p.x + 3.6 - 1.2 * u, p.y + 1.7, p.z + 3.4 + 0.6 * u); cam.lookAt(p.x - 1.4, p.y + 1.25, p.z - 2.2);
    r.render(w.scene, cam); frames.push(canvas.toDataURL('image/jpeg', 0.93));
  }
  w.keys = {}; return frames; }""",
# "Food and water": swinging the rock pick at an ice/ore deposit, chips flying
'mine': """async ({start, count}) => {
  const { THREE, r, cam, canvas } = __T; const w = game.world, frames = [], dep = game.colony.deposits[0], p = w.player.position;
  const N = 34;
  if (start === 0) { const { makeTool } = await import('./src/colony.js'); w.holdTool(makeTool('pickaxe'), makeTool('pickaxe', true));
    await new Promise(res => setTimeout(res, 2500)); p.set(dep.x - 1.3, p.y, dep.z); w.yaw = -Math.PI / 2;  // matches the mining test
    w.yaw = Math.atan2(dep.x - p.x, dep.z - p.z); w.keys = {}; for (let i = 0; i < 12; i++) w.update(1/24, false); }
  for (let f = start; f < Math.min(N, start + count); f++) {
    if (f === 3 || f === 20) w.swingTool(() => w.mineImpact(new THREE.Vector3(dep.x - 0.4, dep.group.position.y + 0.6, dep.z), '#a9c7d8'));
    w.update(1/24, false);
    const u = f / (N - 1);
    cam.position.set(p.x - 1.0 + 0.5 * u, p.y + 1.35, p.z + 3.0 - 0.4 * u); cam.lookAt(p.x + 0.6, p.y + 0.95, p.z);
    r.render(w.scene, cam); frames.push(canvas.toDataURL('image/jpeg', 0.93));
  }
  return frames; }""",
}
LEN = {'build': 48, 'walk': 40, 'mine': 34, 'landing': 480}

with sync_playwright() as p:
    b, page = open_game(p)
    page.keyboard.press('Escape'); page.wait_for_timeout(1500)
    page.evaluate(SETUP)
    for name in WANT:
        d = OUT / ('_frames_' + name); shutil.rmtree(d, ignore_errors=True); d.mkdir()
        i = 0
        for start in range(0, LEN[name], 8):
            for fr in page.evaluate(SHOTS[name], {'start': start, 'count': 8}):
                (d / f'{i:04d}.jpg').write_bytes(base64.b64decode(fr.split(',')[1])); i += 1
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '24', '-i', str(d / '%04d.jpg'), '-c:v', 'libx264', '-crf', '16',
                        '-pix_fmt', 'yuv420p', str(OUT / f'game_{name}.mp4')], check=True)
        print('captured', name, i, 'frames')
    b.close()
