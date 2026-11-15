"""When a film's 3D version cannot load, the pre-rendered MP4 plays instead (src/cinematic.js video fallback).
Usage: python scripts/test-cinematic-video-fallback.py"""
from playwright.sync_api import sync_playwright
import functools, http.server, threading
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1',0), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/briefing_mission.glb', lambda r: r.abort())
    pg.goto(f'http://127.0.0.1:{srv.server_port}/game/', wait_until='networkidle', timeout=90000)
    r = pg.evaluate("""async () => { const {playCinematic} = await import('./src/cinematic.js');
      const p = playCinematic('briefing_mission'); await new Promise(r=>setTimeout(r,5000));
      const v = document.querySelector('.cinematic video'); const t = v?.currentTime;
      document.querySelector('.cine-skip').click(); const played = await p;
      return { video: !!v, time: t, played, src: v?.src.split('/').slice(-2).join('/') }; }""")
    print(r, errs)
    assert r['video'] and r['time'] > 0.5 and r['played'], r
    assert not errs, errs
    print('Video fallback plays when the 3D film is unavailable.'); b.close()
srv.shutdown()
