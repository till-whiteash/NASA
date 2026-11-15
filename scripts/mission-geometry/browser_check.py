"""Check the independent mission note; save desktop/mobile evidence."""
import argparse
import functools
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[2]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/game/mission-geometry/'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width':1280,'height':1024}, device_scale_factor=1)
        errors, external = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: external.append(r.url) if not r.url.startswith(f'http://127.0.0.1:{server.server_port}/') else None)
        page.goto(url)
        page.locator('#explorer').wait_for(state='visible')
        page.locator('.guide img').evaluate('(img)=>img.decode()')
        page.screenshot(path=str(args.out/'mission-radio-desktop.png'), full_page=True)
        initial = page.locator('#delay').inner_text()
        page.get_by_role('button',name='Find a shorter wait').click()
        near = {'date':page.locator('#date-label').inner_text(),'delay':page.locator('#delay').inner_text(),'distance':float(page.locator('#distance').inner_text())}
        page.get_by_role('button',name='Find a longer wait').click()
        far = {'date':page.locator('#date-label').inner_text(),'delay':page.locator('#delay').inner_text(),'distance':float(page.locator('#distance').inner_text())}
        assert near['distance'] < far['distance'] and initial != near['delay']
        slider = page.get_by_label('Try a different month')
        slider.focus()
        slider.press('ArrowRight')
        assert page.locator('#date-label').inner_text() != far['date'], 'Keyboard date selection failed'
        page.locator('.why summary').click()
        assert page.locator('#round-trip').is_visible()
        assert page.evaluate('localStorage.length') == 0, 'Must never write a mission save'
        page.emulate_media(reduced_motion='reduce')
        assert page.locator('.star').first.evaluate('(e)=>getComputedStyle(e).animationName') == 'none'
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(args.out/'mission-radio-mobile.png'), full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow'
        assert not errors and not external, (errors,external)
        failed = browser.new_page()
        failed.route('**/earth-mars.json', lambda route: route.fulfill(status=503, body='unavailable'))
        failed.goto(url)
        failed.locator('#error').wait_for(state='visible')
        assert not failed.locator('#explorer').is_visible(), 'Failed load showed fabricated values'
        result={'initial_delay':initial,'near':near,'far':far,'keyboard':True,'reduced_motion':True,'mobile_no_overflow':True,'no_save_writes':True,'no_external_runtime_requests':True,'failed_fetch_handled':True,'page_errors':errors}
        (args.out/'browser-check.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(result))
        browser.close()
finally:
    server.shutdown()
    server.server_close()
