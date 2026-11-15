"""Browser check for the power tutorial's circuit lab and 3D printer.
- Series: four cells chained make 48 V at the lamp; a short circuit is caught and the wire removed.
- Parallel: a 2s2p pack makes 24 V with every cell sharing the current.
- Grounding: a fault makes the ungrounded frame live (48 V, dangerous body current); once the frame is grounded the
  fault trips the fuse and the frame stays at 0 V.
- Printer: prints the starter parts layer by layer and records them.
Usage: python scripts/test-circuit-lab-browser.py [screenshot folder]"""
from playwright.sync_api import sync_playwright
import functools, http.server, sys, threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHOTS = Path(sys.argv[1]) if len(sys.argv) > 1 else None
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1366, 'height': 768}); errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(f'http://127.0.0.1:{srv.server_port}/game/', wait_until='networkidle', timeout=90000)
    shot = lambda n: SHOTS and pg.screenshot(path=str(SHOTS / n))
    if SHOTS: SHOTS.mkdir(parents=True, exist_ok=True)
    r = pg.evaluate("""async () => {
      const { openCircuitLab } = await import('./src/circuit-lab.js'); const steps = [];
      window._labDone = openCircuitLab({ start: 'series', onStep: s => steps.push(s) }); window._steps = steps;
      await new Promise(r => setTimeout(r, 300));
      const lab = document.querySelector('.circuit-lab').lab, out = {};
      lab.connect('c0p', 'c0n'); out.short = document.querySelector('.cl-feedback').textContent.includes('Short circuit');
      for (const [a, b] of [['c0p','c1n'],['c1p','c2n'],['c2p','c3n'],['c3p','Lp'],['c0n','Ln']]) lab.connect(a, b);
      out.series = lab.readings(); out.seriesDone = steps.includes('series');
      return out; }""")
    pg.wait_for_timeout(700); shot('lab-series.png')
    print('series', r)
    assert r['short'], 'a short circuit should be caught'
    assert r['seriesDone'] and r['series']['V'] > 44, r
    r = pg.evaluate("""async () => {
      const lab = document.querySelector('.circuit-lab').lab; lab.startLesson('parallel');
      for (const [a, b] of [['c0p','c1n'],['c2p','c3n'],['c1p','c3p'],['c0n','c2n'],['c3p','Lp'],['c2n','Ln']]) lab.connect(a, b);
      return { r: lab.readings(), done: window._steps.includes('parallel') }; }""")
    pg.wait_for_timeout(700); shot('lab-parallel.png')
    print('parallel', r)
    assert r['done'] and 22 < r['r']['V'] < 26, r
    r = pg.evaluate("""async () => {
      const lab = document.querySelector('.circuit-lab').lab; lab.startLesson('ground'); const out = {};
      lab.fault(); out.live = document.querySelector('[data-m="body"]').textContent; out.liveMsg = document.querySelector('.cl-feedback').textContent;
      await new Promise(r => setTimeout(r, 400));
      return out; }""")
    shot('lab-ground-live.png')
    r2 = pg.evaluate("""async () => {
      const lab = document.querySelector('.circuit-lab').lab, out = {};
      lab.fault();                                   // repair
      lab.connect('F', 'G');
      lab.fault();                                   // fault again: now it should trip the fuse
      out.body = document.querySelector('[data-m="body"]').textContent; out.msg = document.querySelector('.cl-feedback').textContent;
      out.done = window._steps.includes('ground'); return out; }""")
    pg.wait_for_timeout(500); shot('lab-ground-safe.png')
    print('ground', r, r2)
    assert 'live' in r['liveMsg'] and int(r['live'].split()[0]) >= 30, r
    assert r2['done'] and r2['body'].startswith('0'), r2
    pg.evaluate("document.querySelector('.circuit-lab .cl-close').click()")
    pg.wait_for_timeout(600)
    r = pg.evaluate("""async () => {
      const { openFabricator } = await import('./src/fabricator.js');
      const outpost = { powerStep: 1 }, store = { silica: 1 };
      window._fab = openFabricator({ outpost, store, need: ['Support frame', 'Output connector'] }); window._o = outpost;
      await new Promise(r => setTimeout(r, 400)); document.querySelector('.fabricator').fab.printAll();
      await new Promise(r => setTimeout(r, 3500)); return { busy: document.querySelector('.fabricator').fab.busy() }; }""")
    shot('printer.png')
    pg.wait_for_function("!document.querySelector('.fabricator').fab.busy()", timeout=40000)
    r2 = pg.evaluate("({ printed: window._o.powerLearn.printed, feed: window._o.powerLearn.feed })")
    print('printer', r, r2)
    assert r['busy'] and r2['printed'] == ['Support frame', 'Output connector'] and r2['feed'] == 15, r2
    assert not errors, errors
    print('Circuit lab (series, parallel, grounding) and 3D printer work.')
    b.close()
srv.shutdown()
