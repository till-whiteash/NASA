import functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
out=root/'.playwright-mcp';out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1000,'height':700})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/guide-preview.html',lambda route:route.fulfill(content_type='text/html',body='''
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="/game/construction.css">
      <style>body{background:#151e29;color:white;font:16px system-ui}#dialogue{padding:20px}</style>
      <div id="dialogue"></div>
      <script type="module">
      import {zhetela,zhetelaPortraitHTML} from '/game/src/zhetela.js';
      window.showGuide=zhetela;
      document.querySelector('#dialogue').innerHTML=zhetelaPortraitHTML();
      zhetela('Your habitat is ready. Connect the power supply before your next expedition.',false,{step:'preview'});
      </script>'''))
    page.goto(f'http://127.0.0.1:{server.server_port}/guide-preview.html')
    page.wait_for_function("document.querySelectorAll('.zhetela-avatar img').length===2 && [...document.querySelectorAll('.zhetela-avatar img')].every(i=>i.complete&&i.naturalWidth)")
    page.screenshot(path=str(out/'zhetela-app-desktop.png'))
    page.evaluate("showGuide('Construction complete. Great work!',true,{step:'success'})")
    assert page.locator('#zhetela-message img').get_attribute('src').endswith('wave.webp')
    page.evaluate("dispatchEvent(new CustomEvent('zhetela-voice-status',{detail:'Speaking'}))")
    assert page.locator('#zhetela-message img').get_attribute('src').endswith('speaking.webp')
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function("document.querySelector('#zhetela-message img').currentSrc.endsWith('portrait.webp')")
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(out/'zhetela-app-phone.png'))
    page.add_style_tag(url=f'http://127.0.0.1:{server.server_port}/game/moon/hud.css')
    assert page.locator('#zhetela-message').bounding_box()['width']<=390
    page.screenshot(path=str(out/'zhetela-app-moon.png'))
    page.get_by_role('button',name='Dismiss Zhetela message').click()
    assert page.locator('#zhetela-message').is_hidden()
    assert not errors,errors
    browser.close()
server.shutdown()
print('PASS: portraits loaded, success wave, speaking state, reduced motion, phone/Moon layout, dismiss, no JS errors')
