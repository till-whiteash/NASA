"""Verify the real new-game arrival, pod hatch and optional film without debug-skipping progress."""
from pathlib import Path
import argparse,json,sys,time
parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);a=parser.parse_args();a.out.mkdir(exist_ok=True,parents=True)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'game/animation/trailer/scripts'))
from game_session import open_game,sync_playwright
with sync_playwright() as p:
 b,page=open_game(p,w=1280,h=820);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 deadline=time.monotonic()+140
 while time.monotonic()<deadline:
  if page.evaluate('!!window.game?.inside && !!window.game?.outpost?.habBuild?.pioneer'):break
  acted=page.evaluate("""()=>{
   const welcome=[...document.querySelectorAll('#modal h3')].some(h=>h.textContent.includes('Welcome to Mars'));
   if(welcome)return 'welcome';
   const pick=document.querySelector('#arrival [data-region="gusev"]:not(:disabled)');
   if(pick){pick.click();document.querySelector('#arrival [data-confirm]').click();return 'site';}
   for(const selector of ['#arrival [data-skip]','.cinematic:not(.cine-out) .cine-skip','.scene-cinematic .cs-skip','#skip']){const el=document.querySelector(selector);if(el&&el.getClientRects().length&&!el.hidden&&!el.disabled){el.click();return selector;}}
   return 'wait';
  }""")
  page.wait_for_timeout(500)
 else:
  page.screenshot(path=str(a.out/'arrival-failure.png'));raise AssertionError('Arrival did not enter pod: '+page.locator('body').inner_text()[-1800:])
 assert page.evaluate('game.inside && game.world.firstPerson && !game.outpost.habBuild.pioneer.exitedPod')
 page.keyboard.press('Escape');page.wait_for_timeout(300)
 page.screenshot(path=str(a.out/'first-person-pod.png'))
 page.evaluate("()=>{game.station('ship-panel');}")
 page.get_by_role('button',name='Plan my base · field manual',exact=True).click()
 assert page.get_by_role('dialog',name='Field manual · From landing pod to home').is_visible()
 page.screenshot(path=str(a.out/'field-manual.png'))
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400)
 assert page.locator('#modal .modal-box').evaluate('(e)=>e.getBoundingClientRect().width<=innerWidth')
 page.screenshot(path=str(a.out/'field-manual-phone.png'))
 page.set_viewport_size({'width':1280,'height':820});page.wait_for_timeout(300)
 before=page.evaluate('JSON.stringify(game.outpost.habBuild)')
 page.get_by_role('button',name='See the long-term outpost vision',exact=True).click()
 page.wait_for_selector('.cinematic video',timeout=30000)
 page.wait_for_function('document.querySelector(".cinematic video")?.readyState>=2',timeout=30000)
 page.screenshot(path=str(a.out/'construction-demonstration.png'))
 page.locator('.cinematic .cine-skip').click()
 page.wait_for_selector('.cinematic',state='detached',timeout=15000)
 page.wait_for_selector('#modal:not(.hidden) h3',timeout=15000)
 assert page.evaluate('JSON.stringify(game.outpost.habBuild)')==before,'Film changed construction progress'
 page.get_by_role('button',name='Mission archive and next destination',exact=True).click()
 page.get_by_role('link',name='Optional: explore Earth–Mars radio delay ↗').scroll_into_view_if_needed()
 page.screenshot(path=str(a.out/'mission-archive-link.png'))
 with page.expect_popup() as opened:
  page.get_by_role('link',name='Optional: explore Earth–Mars radio delay ↗').click()
 explorer=opened.value;explorer.wait_for_load_state('domcontentloaded');assert '/mission-geometry/' in explorer.url;explorer.close()
 assert page.get_by_role('dialog',name='Field manual · Mission archive and next destination').is_visible()
 assert page.evaluate('JSON.stringify(game.outpost.habBuild)')==before
 page.get_by_role('button',name='Back to my mission',exact=True).click()
 page.evaluate("()=>{game.station('ship-exit');}")
 page.wait_for_function('game.airlock?.cycle.ready',timeout=30000)
 page.evaluate("()=>{game.station('airlock-control');}")
 page.wait_for_function('!game.inside && game.outpost.habBuild.pioneer.exitedPod')
 page.wait_for_function('document.querySelector("#mission-objective summary")?.textContent.includes("Recover your building cargo")')
 page.wait_for_timeout(400)
 page.screenshot(path=str(a.out/'first-eva.png'))
 result=page.evaluate('({inside:game.inside,firstPerson:game.world.firstPerson,objective:game.mission.objective().id,exited:game.outpost.habBuild.pioneer.exitedPod,step:game.outpost.habBuild.step})')
 assert result['objective']=='hab-salvage' and result['step']==0,result
 # Save two recovered bundles, reload the actual mission, and force the low-air rescue path.
 page.evaluate("()=>{const h=game.world.habBuild;h.use(h.cargo[0]);h.use(h.cargo[1]);}")
 before=page.evaluate('JSON.stringify(game.outpost.habBuild.pioneer)')
 page.evaluate("()=>{const key='zhetalis-unity-mars-save-v1';const d=JSON.parse(localStorage.getItem(key));d.suit=.0001;localStorage.setItem(key,JSON.stringify(d));window.__resetting=true;}")
 page.reload(wait_until='networkidle');page.locator('#resume').click()
 page.wait_for_function('window.game?.outpost?.habBuild?.pioneer?.collected.length===2',timeout=180000)
 assert page.evaluate('JSON.stringify(game.outpost.habBuild.pioneer)')==before,'Reload lost cargo progress'
 page.get_by_role('dialog',name='Out of suit air!').wait_for(timeout=60000)
 page.get_by_role('button',name='OK',exact=True).click()
 page.wait_for_function('game.inside')
 page.wait_for_function("JSON.parse(localStorage.getItem('zhetalis-unity-mars-save-v1'))?.ship===true",timeout=10000)
 result['cargoSurvivedReload']=True;result['rescueReturnsToPod']=True
 page.screenshot(path=str(a.out/'pod-rescue.png'))
 assert not errors,errors
 (a.out/'arrival-and-film.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
