"""Play a low-memory mission from title to habitat; optional screenshot folder argument."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import re, json, sys
ROOT=Path(__file__).resolve().parents[1]
from browser_test_server import start_server
server=start_server()
try:
 out=Path(sys.argv[1]) if len(sys.argv)>1 else None
 if out: out.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as p:
  b=p.chromium.launch(channel='msedge',headless=True)
  page=b.new_page(viewport={'width':1280,'height':720}); errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/game/?graphics=low&chunks=1&overlaps#debug',wait_until='domcontentloaded',timeout=90000)
  page.wait_for_selector('#start',timeout=90000);page.locator('#start').click()
  for i in range(2):
   page.wait_for_selector('.cinematic:not(.cine-out) video',timeout=90000);page.wait_for_timeout(700);page.keyboard.press('Escape');page.wait_for_timeout(500)
  page.wait_for_selector('.briefing-walk canvas',timeout=60000)
  page.wait_for_function("!document.querySelector('.bw-load')",timeout=90000)
  page.wait_for_timeout(1500)
  if out: page.screenshot(path=str(out/'briefing-room.png'))
  room=page.evaluate("()=>{const c=document.querySelector('.briefing-walk canvas');return {width:c.width,height:c.height}}")
  assert room['width']*room['height']<=960*540,room
  print('BRIEFING',room,flush=True)
  page.locator('.bw-ready').click()
  page.wait_for_selector('.cinematic:not(.cine-out) video',timeout=120000);page.wait_for_timeout(1000)
  paused=page.evaluate("async()=>{const r=game.renderer,original=r.render;let count=0;r.render=function(...a){count++;return original.apply(this,a)};await new Promise(r=>setTimeout(r,1000));r.render=original;return count}")
  assert paused==0,paused
  print('LAUNCH VIDEO hidden game renders',paused,flush=True)
  page.keyboard.press('Escape')
  page.wait_for_selector('.cinematic:not(.cine-out) video',timeout=180000);page.wait_for_timeout(600);page.keyboard.press('Escape')
  page.wait_for_selector('[data-region="gusev"]',timeout=90000)
  page.locator('[data-region="gusev"]').click();page.locator('[data-confirm]').click()
  page.locator('[data-skip]').click()
  page.wait_for_selector('.scene-cinematic',timeout=60000)
  page.wait_for_function('!game.world.cutscenePreparing',timeout=90000)
  page.wait_for_timeout(16500)
  if out: page.screenshot(path=str(out/'landing.png'))
  page.locator('.cs-skip').click()
  page.wait_for_selector('#modal:not(.hidden)',timeout=60000)
  page.keyboard.press('Escape');page.wait_for_timeout(1500)
  print('ARRIVAL',page.evaluate('({memory:game.renderer.info.memory,render:game.renderer.info.render,lander:!!game.world.lander})'),flush=True)
  # Film replays without a world argument must also suspend the existing game.
  result=page.evaluate("""async()=>{const cine=await import('./src/cinematic.js');const r=game.renderer,original=r.render;let count=0;
  r.render=function(...a){count++;return original.apply(this,a)};const film=cine.playCinematic('ascent_mars');await new Promise(r=>setTimeout(r,1000));
  const paused=count===0;document.querySelector('.cine-skip').click();await film;await new Promise(r=>setTimeout(r,650));r.render=original;
  return {paused,resumed:count>0};}""")
  assert all(result.values()),result;print('REPLAY',result,flush=True)
  # Complete the building quest, then exercise each module and its crew animation.
  page.evaluate("game.outpost.habBuild.step=6;game.world.habBuild.apply();game.outpost.chargeReserve=100")
  page.evaluate("game.goInside()")
  page.wait_for_timeout(2500)
  print('HABITAT',page.evaluate('({memory:game.renderer.info.memory,render:game.renderer.info.render})'),flush=True)
  if out: page.screenshot(path=str(out/'habitat.png'))
  print('OVERLAPS',page.evaluate('JSON.stringify(window.habOverlaps?.map(x=>({depth:x.depth,a:x.a,b:x.b})))'),flush=True)
  print('ERRORS',errors,flush=True)
  assert not errors,errors
  b.close()
finally:server.shutdown()
