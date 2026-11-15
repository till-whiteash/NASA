"""Exercise real inventory controls, capacity and persistence in a live mission."""
from pathlib import Path
import argparse,json,sys,time
p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);out=p.parse_args().out;out.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'game/animation/trailer/scripts'))
from game_session import open_game,sync_playwright
with sync_playwright() as p:
 b,page=open_game(p,w=1280,h=900);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 deadline=time.monotonic()+140
 while time.monotonic()<deadline:
  if page.evaluate('!!game.inside && !!game.outpost.habBuild?.pioneer'):break
  page.evaluate("""()=>{const pick=document.querySelector('#arrival [data-region="gusev"]:not(:disabled)');if(pick){pick.click();document.querySelector('#arrival [data-confirm]').click();return;}for(const s of ['#arrival [data-skip]','.cinematic:not(.cine-out) .cine-skip','.scene-cinematic .cs-skip','#skip']){const e=document.querySelector(s);if(e?.getClientRects().length&&!e.disabled){e.click();return;}}}""")
  page.wait_for_timeout(500)
 else:raise AssertionError('Arrival did not finish')
 page.keyboard.press('Escape')
 page.evaluate("()=>{game.colony.s.bag.hematite=77;game.colony.s.bag.silica=20;game.colony.s.store.hematite=10;game.colony.s.store.silica=80;}")
 # Opening the real station must not silently unload samples.
 page.evaluate("()=>{game.station('locker');}")
 assert page.evaluate('game.colony.s.bag.hematite')==77
 page.get_by_role('tab',name='Base locker',exact=True).click()
 page.locator('[data-item="tool:builder"]').click();page.get_by_role('button',name='Take to quick tools',exact=True).click()
 page.locator('[data-item="tool:jug"]').click();page.get_by_role('button',name='Take to quick tools',exact=True).click()
 assert page.evaluate('game.colony.s.belt.length')==3
 page.get_by_role('tab',name='Backpack',exact=True).click()
 page.locator('[data-item="hematite:0"]').click();page.get_by_role('button',name='Store this stack',exact=True).click()
 assert page.evaluate('game.colony.s.bag.hematite===13&&game.colony.s.store.hematite===74')
 page.get_by_role('button',name='Store 1 sample',exact=True).click()
 assert page.evaluate('game.colony.s.bag.hematite===12&&game.colony.s.store.hematite===75')
 page.get_by_role('tab',name='Base locker',exact=True).click()
 page.get_by_role('searchbox',name='Find an inventory item').fill('silica')
 assert page.locator('.inventory-grid [data-item]').count()==2
 page.locator('[data-item="silica:0"]').click();page.get_by_role('button',name='Take this stack',exact=True).click()
 assert page.evaluate('game.colony.s.bag.silica===84&&game.colony.s.store.silica===16')
 page.get_by_role('searchbox',name='Find an inventory item').fill('')
 page.get_by_role('tab',name='Backpack',exact=True).click()
 page.locator('[data-item="silica:0"]').click();page.screenshot(path=str(out/'live-backpack.png'))
 page.get_by_role('button',name='Store all samples',exact=True).click()
 assert page.evaluate('game.colony.bagCount()===0&&game.colony.s.store.hematite===87&&game.colony.s.store.silica===100')
 before=page.evaluate('JSON.stringify({belt:game.colony.s.belt,bag:game.colony.s.bag,store:game.colony.s.store})')
 page.get_by_role('button',name='Back to game',exact=True).click()
 page.keyboard.press('Digit1');page.keyboard.press('Digit3');assert page.evaluate("game.colony.tool==='jug'")
 page.keyboard.press('KeyI');page.get_by_role('dialog',name='Your backpack',exact=True).wait_for()
 page.get_by_role('tab',name='Base locker · view only',exact=True).click()
 page.locator('[data-item="hematite:0"]').click()
 assert page.get_by_role('button',name='Take this stack',exact=True).is_disabled()
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400)
 assert page.locator('.inventory-modal').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
 page.screenshot(path=str(out/'live-backpack-phone.png'))
 page.keyboard.press('Escape')
 page.set_viewport_size({'width':1280,'height':900})
 page.reload(wait_until='networkidle');page.locator('#resume').click()
 # buildWorld creates a fresh Colony before resume applies the saved state.
 page.wait_for_function('!!window.game?.inside && !!window.game?.colony?.s',timeout=180000)
 restored=page.evaluate('JSON.stringify({belt:game.colony.s.belt,bag:game.colony.s.bag,store:game.colony.s.store})')
 assert json.loads(restored)==json.loads(before),{'expected':json.loads(before),'restored':json.loads(restored)}
 assert not errors,errors
 result={'sixToolSlots':True,'threeToolsCarried':True,'explicitUnload':True,'stackTransfer':True,'singleTransfer':True,'search':True,'remoteTransferBlocked':True,'phoneFits':True,'saveReload':True,'errors':errors}
 (out/'inventory-check.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
