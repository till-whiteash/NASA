from pathlib import Path
import functools, http.server, threading
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);out=parser.parse_args().out
out.mkdir(exist_ok=True,parents=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True,args=['--use-angle=d3d11'])
    page=b.new_page(viewport={'width':1100,'height':720})
    page.goto(f'http://127.0.0.1:{server.server_port}/game/',wait_until='networkidle')
    page.evaluate("""async()=>{const {zhetela}=await import('./src/zhetela.js');zhetela('Your lander is home for now. Collect the six cargo bundles, then use the calibrator to check the building site. We will build one module at a time.',true,{step:'preview'});}""")
    page.wait_for_timeout(1200)
    assert page.locator('#zhetela-message canvas').evaluate('(c)=>c.getContext("2d").getImageData(0,0,192,205).data.some(v=>v>0)')
    page.locator('#zhetela-message').screenshot(path=str(out/'zhetela-guide.png'))
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(600)
    page.locator('#zhetela-message').screenshot(path=str(out/'zhetela-guide-phone.png'))
    page.set_viewport_size({'width':1100,'height':720})
    page.goto(f'http://127.0.0.1:{server.server_port}/game/moon/',wait_until='networkidle')
    page.evaluate("async()=>{const {zhetela}=await import('./src/zhetela.js');zhetela('Follow the marker to your next task. We will build one step at a time.',false,{step:'preview'});}")
    page.wait_for_timeout(700)
    page.locator('#zhetela-message').screenshot(path=str(out/'zhetela-guide-moon.png'))
    print(out/'zhetela-guide.png')
    b.close()
server.shutdown()
