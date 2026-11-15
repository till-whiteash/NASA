"""Low-memory film decoding, guide assets, guided arrival, first build and inventory."""
from playwright.sync_api import sync_playwright
from browser_test_server import start_server
import re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
server=start_server()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge',headless=True)
  page=browser.new_page(viewport={'width':1280,'height':720});errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:requests.append(r.url))
  page.goto(f'http://127.0.0.1:{server.server_port}/game/?graphics=low&chunks=1#debug',wait_until='domcontentloaded')
  page.wait_for_function('!!window.game',timeout=60000)
  page.evaluate("async()=>{window.cine=await import('./src/cinematic.js');}")
  names=re.findall(r"'([^']+)'",re.search(r'const HD_FILMS = new Set\(\[([\s\S]*?)\]\)',(root/'game/src/cinematic.js').read_text()).group(1))
  for name in names:
   page.evaluate('name=>{window.film=cine.playCinematic(name);}',name)
   page.wait_for_function('document.querySelector(".cinematic:not(.cine-out) video")?.currentTime>.1',timeout=15000)
   v=page.locator('.cinematic:not(.cine-out) video').evaluate('(v)=>({w:v.videoWidth,h:v.videoHeight,src:v.currentSrc,duration:v.duration})')
   assert (v['w'],v['h'])==(1280,720) and '-lite.mp4' in v['src'],v
   if name=='launch_earth':assert 55.9<v['duration']<56.1,v
   page.keyboard.press('Escape');page.wait_for_timeout(430)
  assert not any('-hd.mp4' in u for u in requests),requests
  page.locator('#guided-start').click()
  page.wait_for_function('game.inside && game.world?.habBuild && game.outpost?.habBuild?.pioneer',timeout=60000)
  page.wait_for_selector('#modal:not(.hidden)',timeout=60000);page.keyboard.press('Escape')
  result=page.evaluate('''async()=>{
   const r=game.renderer,h=game.world.habBuild,o=game.outpost;
   const before=game.suit;await new Promise(r=>setTimeout(r,500));
   const result={antialias:r.getContext().getContextAttributes().antialias,shadows:r.shadowMap.enabled,practiceAir:game.suit===before};
   o.habBuild.pioneer.exitedPod=true;h.apply();h.use(h.cargo[0]);const stock=JSON.stringify(o.habBuild.pioneer.stock);h.use(h.starter);
   result.built=o.habBuild.pioneer.starterBuilt;result.stock=stock===JSON.stringify(o.habBuild.pioneer.stock);result.journal=o.learning.entries.some(e=>e.kind==='build');
   return result;}''')
  assert not result['antialias'] and not result['shadows'] and all(result[k] for k in ['practiceAir','built','stock','journal']),result
  page.evaluate("()=>{game.colony.s.bag.hematite=77;game.colony.s.store.hematite=10;game.station('locker');}")
  page.get_by_role('tab',name='Backpack',exact=True).click()
  page.locator('[data-item="hematite:0"]').click();page.get_by_role('button',name='Store this stack',exact=True).click()
  assert page.evaluate('game.colony.s.bag.hematite===13&&game.colony.s.store.hematite===74')
  assert not any('/zhetela/wave/' in u or '/zhetela/standing.png' in u for u in requests)
  assert any('/zhetela-app/portrait.webp' in u for u in requests)
  assert not errors,errors
  print('PASS',len(names),'Lite films, guided arrival, practice air, first build, decision journal, inventory transfer, no heavy portraits, no JS errors',result,flush=True)
  browser.close()
finally:server.shutdown()
