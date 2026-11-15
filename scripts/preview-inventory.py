from pathlib import Path
import functools,http.server,threading,argparse
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);out=p.parse_args().out;out.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);page=b.new_page(viewport={'width':1280,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/game/',wait_until='networkidle',timeout=120000)
 page.evaluate("""async()=>{
  const {openInventory}=await import('./src/inventory.js'),{newColony,Colony}=await import('./src/colony.js');
  const s=newColony();s.belt=['pickaxe','builder','jug'];s.locker=[];s.jug=8;s.bag={hematite:77,gypsum:12,iron:9,silica:20,carbonate:3};s.store={hematite:126,gypsum:42,iron:28,silica:70,carbonate:19};
  const colony=Object.create(Colony.prototype);colony.s=s;colony.world={holdTool(){}};
  window.previewColony=colony;
  openInventory({colony,outpost:{parts:18,rations:24,powerStep:1,habBuild:{pioneer:{calibrator:true,stock:{alloy:18,membrane:12,seals:6}}}},atLocker:true});
 }""")
 page.locator('[data-item="hematite:0"]').click();page.screenshot(path=str(out/'inventory-backpack.png'),full_page=True)
 page.get_by_role('tab',name='Base locker',exact=True).click();page.locator('[data-item="silica:0"]').click();page.screenshot(path=str(out/'inventory-locker.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(out/'inventory-phone.png'),full_page=True)
 assert not errors,errors
 print('Preview screenshots:',out);b.close()
server.shutdown()
