"""In-game check of the power tutorial flow: the 3D printer is a real station, the quest sends the player to print the
parts, the workbench refuses to assemble until the parts are printed and the circuit training is done, and once
the solar side is wired the field shows coiled red/black cables and the cabinet's ground rod.
Usage: python scripts/test-power-tutorial-browser.py"""
from playwright.sync_api import sync_playwright
import functools, http.server, threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def copyfile(self, s, o):
        try: super().copyfile(s, o)
        except (ConnectionResetError, BrokenPipeError): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720}); errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(f'http://127.0.0.1:{srv.server_port}/game/#debug', wait_until='networkidle', timeout=90000)
    pg.route('**/block-island.stl', lambda r: r.abort())
    pg.click('#start')
    for _ in range(80):                                   # skip the films; leave the briefing room
        if pg.locator('.briefing-walk .bw-ready').count(): pg.click('.briefing-walk .bw-ready'); break
        if pg.locator('.cinematic:not(.cine-out) .cine-skip').count(): pg.click('.cinematic:not(.cine-out) .cine-skip', timeout=2000)
        pg.wait_for_timeout(700)
    pg.wait_for_function('window.game?.construction && window.game.world?.settlement', timeout=180000)
    r = pg.evaluate("""async () => {
      const o = game.outpost, out = {};
      if (o.habBuild) o.habBuild.step = 99; if (o.safetyChecks) { o.safetyChecks.reserves = true; o.safetyChecks.shelter = true; }
      o.powerStep = 1;
      out.printer = !!game.interior.stations.find(s => s.type === 'fabricator');
      out.task1 = game.mission.objective();
      game.station('workbench'); await new Promise(r => setTimeout(r, 300));
      out.benchSays = document.querySelector('#modal')?.textContent.slice(0, 140); document.querySelector('#modal .choices button, #modal button')?.click();
      game.station('fabricator'); await new Promise(r => setTimeout(r, 800));
      out.printerOpen = !!document.querySelector('.fabricator'); document.querySelector('.fabricator').fab.printAll();
      return out; }""")
    print('start', {k: (v if k != 'task1' else v.get('id')) for k, v in r.items()})
    try: pg.wait_for_function("!document.querySelector('.fabricator').fab.busy()", timeout=40000)
    except Exception: print("STUCK", pg.evaluate("document.querySelector('.fab-msg').textContent"), errors); raise
    r2 = pg.evaluate("""async () => {
      const o = game.outpost, out = {};
      document.querySelector('.fabricator .cl-close').click(); await new Promise(r => setTimeout(r, 500));
      out.printed = o.powerLearn.printed; out.task2 = game.mission.objective().id;
      game.station('workbench'); await new Promise(r => setTimeout(r, 300));
      out.benchSays = document.querySelector('#modal')?.textContent.slice(0, 80);
      [...document.querySelectorAll('#modal button')].find(b => /circuit lab/i.test(b.textContent))?.click(); await new Promise(r => setTimeout(r, 800));
      out.labOpen = !!document.querySelector('.circuit-lab'); document.querySelector('.circuit-lab .cl-close')?.click();
      o.powerLearn.lab = { series: true, parallel: true, ground: true }; out.task3 = game.mission.objective().id;
      // field wiring: both solar leads -> coiled cables and the cabinet ground rod
      o.powerStep = 5; o.construction = Object.assign({ placed: {}, cleared: [], rockHits: {}, removed: [], connections: [] }, o.construction || {}); o.construction.leads = { 0: ['+', '-'] };
      game.construction.update(false, null, false);
      out.cables = [...game.construction.cables.keys()]; out.coiled = game.construction.cables.get('0+')?.children.length; out.groundRod = !!game.construction.groundRod;
      return out; }""")
    print('after printing', r2)
    import sys, base64
    if len(sys.argv) > 1:                                  # a look at the field cables beside the battery cabinet
        img = pg.evaluate("""async () => { const THREE = await import('three'); const w = game.world, pack = w.settlement.pack.position;
          const cv = document.createElement('canvas'); cv.width = 1100; cv.height = 620; const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
          r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace; w.settlement.pack.visible = true;
          const cam = new THREE.PerspectiveCamera(50, 1100 / 620, .05, 400); cam.position.set(pack.x - 3.2, pack.y + 2.2, pack.z + 3.6); cam.lookAt(pack.x - 1.2, pack.y - .3, pack.z + .6);
          r.render(w.scene, cam); return cv.toDataURL('image/jpeg', .85); }""")
        Path(sys.argv[1]).write_bytes(base64.b64decode(img.split(',')[1]))
    assert r['printer'] and r['task1']['target'] == 'fabricator' and 'print' in r['benchSays'].lower() and r['printerOpen'], r
    assert len(r2['printed']) == 4 and r2['task2'] == 'lab-series' and r2['labOpen'] and r2['task3'] == 'power-1', r2
    assert set(r2['cables']) >= {'0+', '0-'} and r2['coiled'] >= 3 and r2['groundRod'], r2
    assert not errors, errors
    print('Printer station, print-then-train gates, coiled cables and ground rod work in the game.')
    b.close()
srv.shutdown()
