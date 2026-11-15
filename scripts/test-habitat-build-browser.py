"""Browser check for the habitat building quest: a new game starts with an empty site; walking there, breaking the
four rocks, framing every module, unfolding the shells, fitting the airlocks and pressurising finishes the habitat,
which then has its collisions, stairs and greenhouse back and opens its doors.
Usage: python scripts/test-habitat-build-browser.py [screenshot folder]"""
import sys, base64
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'game' / 'animation' / 'trailer' / 'scripts'))
from game_session import open_game, sync_playwright
SHOTS = Path(sys.argv[1]) if len(sys.argv) > 1 else None

STEP = """async (n) => { const w = game.world; for (let i = 0; i < n; i++) { w.habBuild.update(1/24); w.update(1/24, false); } return game.mission.objective(); }"""
SHOT = """async (name) => {
  const THREE = await import('three'); const w = game.world, hb = w.habBuild, c = hb.centre;
  const r = window.__R ??= new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(1280, 720);
  r.toneMapping = w.renderer.toneMapping; r.outputColorSpace = w.renderer.outputColorSpace; r.localClippingEnabled = true;
  const cam = new THREE.PerspectiveCamera(45, 16/9, .1, 3000); cam.position.set(c.x + 26, 20, hb.front + 30); cam.lookAt(c.x, 2, c.z);
  r.render(w.scene, cam); return r.domElement.toDataURL('image/jpeg', .85); }"""

def shot(page, name):
    if SHOTS: SHOTS.mkdir(parents=True, exist_ok=True); (SHOTS / f'{name}.jpg').write_bytes(base64.b64decode(page.evaluate(SHOT, name).split(',')[1]))

with sync_playwright() as p:
    b, page = open_game(p)
    page.keyboard.press('Escape'); page.wait_for_timeout(1500)
    start = page.evaluate("""() => { const w = game.world, hb = w.habBuild, o = game.outpost;
      return { obj: game.mission.objective().id, model: w.settlement.model.visible, stairs: w.settlement.group.visible,
               colliders: hb.colliders.filter(q => w.colliders.includes(q)).length, total: hb.colliders.length, modules: hb.mods.length,
               door: game.mission.target('hab') && true }; }""")
    print('START', start)
    assert start['obj'] == 'hab-0' and not start['model'] and not start['stairs'] and start['colliders'] == 0, start
    shot(page, '0-empty-site')
    # 0 -> walk to the site
    page.evaluate("() => { const w = game.world, hb = w.habBuild; w.player.position.set(hb.centre.x, w.player.position.y, hb.front + 4); }")
    assert page.evaluate(STEP, 3)['id'] == 'hab-1'
    # 1 -> break four rocks (3 pickaxe strikes each)
    page.evaluate("""async () => { const w = game.world, hb = w.habBuild; game.colony.s.tool = 'pickaxe'; game.colony.tool = 'pickaxe';
      for (const rock of hb.rocks) for (let k = 0; k < 3; k++) { w.player.position.set(rock.position.x - 1.2, w.player.position.y, rock.position.z);
        hb.striking = false; hb.use(rock); for (let i = 0; i < 40 && w.toolSwing >= 0; i++) { w.updateSwing(1/30); } } }""")
    o = page.evaluate(STEP, 1); print('AFTER ROCKS', o['id'], o.get('step'))
    assert o['id'] == 'hab-2', o
    # 2 -> frame every module
    page.evaluate("() => { const hb = game.world.habBuild; for (const pad of [...hb.pads]) hb.use(pad); }")
    o = page.evaluate(STEP, 40); print('AFTER FRAMES', o['id']); assert o['id'] == 'hab-3', o
    shot(page, '1-frames')
    page.evaluate("() => game.world.habBuild.use(game.world.habBuild.post)")
    page.evaluate(STEP, 30); shot(page, '2-shells-unfolding'); o = page.evaluate(STEP, 60)
    print('AFTER SHELLS', o['id'], page.evaluate("() => game.world.settlement.model.visible")); assert o['id'] == 'hab-4', o
    page.evaluate("() => game.world.habBuild.use(game.world.habBuild.airlock)")
    o = page.evaluate(STEP, 1); assert o['id'] == 'hab-5', o
    # 5 -> pressurise; walking away resets it
    page.evaluate("() => { const w = game.world, hb = w.habBuild, v = hb.valve.position; w.player.position.set(v.x + 1.5, w.player.position.y, v.z + 1); hb.use(hb.valve); }")
    o = page.evaluate(STEP, 48); print('PRESSURE', o.get('step'))
    page.evaluate("() => { const w = game.world; w.player.position.x += 20; }"); page.evaluate(STEP, 2)
    assert page.evaluate("() => game.outpost.habBuild.pressure") == 0, 'walking away should close the valve'
    page.evaluate("() => { const w = game.world, hb = w.habBuild, v = hb.valve.position; w.player.position.set(v.x + 1.5, w.player.position.y, v.z + 1); hb.use(hb.valve); }")
    o = page.evaluate(STEP, 24 * 9); print('DONE', o['id'])
    end = page.evaluate("""() => { const w = game.world, hb = w.habBuild;
      return { built: game.outpost.habBuild.step, model: w.settlement.model.visible, stairs: w.settlement.group.visible, gh: w.settlement.greenhouse.visible,
               colliders: hb.colliders.filter(q => w.colliders.includes(q)).length, total: hb.colliders.length, site: hb.group.visible }; }""")
    print('END', end)
    assert o['id'] == 'safety-reserves' and end['model'] and end['stairs'] and end['gh'] and end['colliders'] == end['total'] and not end['site'], end
    shot(page, '3-finished')
    b.close()
    print('Habitat building quest works end to end in the browser.')
