"""Regression check: authored movies play directly without requesting GLB previews.
Usage: python scripts/test-cinematic-video-fallback.py
The historical filename is retained for existing test commands.
"""
from playwright.sync_api import sync_playwright
import functools, http.server, threading, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
imports = re.search(r'<script type="importmap">(.*?)</script>', (ROOT/'game/index.html').read_text(encoding='utf-8'), re.S).group(1)
fixture = '<base href="/game/"><script type="importmap">' + imports + '</script>'
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel='msedge', headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(); errors=[]; glbs=[]
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('request', lambda r: glbs.append(r.url) if '.glb' in r.url else None)
        pg.route('**/film-test.html', lambda r: r.fulfill(body=fixture, content_type='text/html'))
        pg.goto(f'http://127.0.0.1:{srv.server_port}/film-test.html')
        for name in ['ares_vi_briefing', 'ares_vi_briefing_moon', 'briefing_mission', 'briefing_moon', 'cruise_loop', 'mars_approach', 'launch_moon']:
            result = pg.evaluate("""async name => {
              const {playCinematic} = await import('./src/cinematic.js?v=blender-films-2');
              const world={keys:{KeyW:true},cinematic:false};
              const playback=playCinematic(name,{world});
              await new Promise(r=>setTimeout(r,1400));
              const v=document.querySelector('.cinematic video');
              const result={width:v?.videoWidth,height:v?.videoHeight,time:v?.currentTime,
                src:v?.src,pausedWorld:world.cinematic,keyCleared:!world.keys.KeyW,
                caption:document.querySelector('.cine-cap')?.textContent,canvas:!!document.querySelector('canvas')};
              document.querySelector('.cine-skip').click();
              result.played=await playback;result.resumed=!world.cinematic;
              await new Promise(r=>setTimeout(r,450));return result;
            }""", name)
            assert result['width']==1920 and result['height']==1080 and result['time']>0.2, result
            assert result['src'].endswith(name+'-hd.mp4') and result['caption'], result
            assert result['pausedWorld'] and result['keyCleared'] and result['resumed'] and result['played'], result
            assert not result['canvas'], result
            print(name, 'PASS')
        assert not errors, errors
        assert not glbs, glbs
        b.close()
finally:
    srv.shutdown()
