from pathlib import Path
import functools,http.server,threading,json,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('C:/Users/Lenovo/.codex/visualizations/2026/11/13/01a1d56b-ef59-7f00-bbce-93101280eea1')
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 env={k:v for k,v in os.environ.items() if k.upper() in ['SYSTEMROOT','WINDIR','COMSPEC','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATH']}
 b=p.chromium.launch(channel='msedge',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'],env=env)
 page=b.new_page(viewport={'width':1280,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/game/?graphics=low#debug',wait_until='domcontentloaded')
 page.locator('#start').click(timeout=90000)
 page.locator('#skip').click(timeout=90000)
 page.wait_for_function('window.game?.world?.suit?.model === "Z2"',timeout=120000)
 print('GAME_Z2_LOADED',flush=True)
 page.locator('#arrival [data-region]').first.click(timeout=120000)
 page.locator('#arrival [data-confirm]').click()
 # The journey's Skip advances the survey and then descent.
 for _ in range(4):
  if not page.locator('#arrival').count():break
  skip=page.locator('#arrival [data-skip]')
  if skip.is_visible():skip.click()
  page.wait_for_timeout(300)
 page.wait_for_function('!document.querySelector("#arrival")',timeout=60000)
 # Let the short landing transition finish, then close the welcome message.
 page.get_by_role('button',name="Let's go!",exact=True).click(timeout=120000)
 page.evaluate('game.outpost.commission=null;game.goInside();game.station("suit-rack")')
 page.get_by_role('button',name='Store suit on rack',exact=True).click()
 page.evaluate('game.station("mirror")')
 page.wait_for_function('game.interior.mirror.cabin.userData.realistic && game.interior.mirror.cabin.visible')
 page.screenshot(path=str(OUT/'mirror-in-game.png'))
 stored=page.evaluate('''() => ({inside:game.inside,eva:game.eva,
   model:game.world.suit.model,rack:game.interior.rackedSuit.visible,
   cabin:game.interior.mirror.cabin.visible,
   saved:JSON.parse(localStorage.getItem('zhetalis-unity-mars-save-v1')).eva})''')
 assert stored['inside'] and not stored['eva']['equipped'] and not stored['saved']['equipped'] and stored['cabin'] and stored['rack'],stored
 page.evaluate('game.station("suit-rack")')
 page.get_by_role('button',name='Wear suit and complete EVA checks',exact=True).click()
 page.wait_for_function('game.eva.equipped && !game.interior.rackedSuit.visible')
 assert page.evaluate('game.interior.mirror.suit.root.visible')
 assert not errors,errors
 print(json.dumps({'stored':stored,'errors':errors}),flush=True)
 (OUT/'suit-game-flow.json').write_text(json.dumps({'stored':stored,'errors':errors},indent=2))
 b.close()
server.shutdown()
