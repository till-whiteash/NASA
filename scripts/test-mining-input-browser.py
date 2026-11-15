"""Real mouse/E routing: E never damages, left click mines all three rock kinds."""
from pathlib import Path
import argparse,json,sys,time
p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);out=p.parse_args().out;out.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'game/animation/trailer/scripts'))
from game_session import open_game,sync_playwright
with sync_playwright() as p:
 b,page=open_game(p,w=1280,h=850);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 deadline=time.monotonic()+140
 while time.monotonic()<deadline:
  if page.evaluate('!!game.inside && !!game.outpost.habBuild?.pioneer'):break
  page.evaluate("""()=>{const pick=document.querySelector('#arrival [data-region="gusev"]:not(:disabled)');if(pick){pick.click();document.querySelector('#arrival [data-confirm]').click();return;}for(const s of ['#arrival [data-skip]','.cinematic:not(.cine-out) .cine-skip','.scene-cinematic .cs-skip','#skip']){const e=document.querySelector(s);if(e?.getClientRects().length&&!e.disabled){e.click();return;}}}""")
  page.wait_for_timeout(500)
 else:raise AssertionError('Arrival did not finish')
 page.keyboard.press('Escape')
 page.evaluate("()=>{game.station('ship-exit');}")
 # Advance the unrelated airlock timer deterministically; this test covers rock input.
 page.wait_for_function('!!game.airlock',timeout=10000)
 page.evaluate('game.airlock.cycle.tick(game.airlock.cycle.duration)')
 page.evaluate("()=>{game.station('airlock-control');}")
 page.wait_for_function('!game.inside',timeout=30000)
 page.evaluate("()=>{game.colony.s.held=game.colony.s.belt.indexOf('pickaxe');game.colony.equip();dispatchEvent(new Event('touchstart'));}")
 page.locator('#t-mine').wait_for(state='visible')
 page.evaluate("""async()=>{
  const THREE=await import('three'),{ORES}=await import('./src/colony.js');window.inputTest={THREE,ORES};
  game.renderer.setAnimationLoop(null);const w=game.world,c=game.colony;
  c.s.held=c.s.belt.indexOf('pickaxe');c.equip();w.firstPerson=true;
  inputTest.drain=()=>{for(let n=0;n<90&&w.toolSwing>=0;n++)w.updateSwing(1/60);};
  inputTest.aim=(obj,offset=1.9)=>{const box=new THREE.Box3().setFromObject(obj),point=box.getCenter(new THREE.Vector3());w.player.position.copy(point).add(new THREE.Vector3(0,-.3,offset));w.camera.position.copy(w.player.position).add(new THREE.Vector3(0,1.3,0));w.camera.lookAt(point);w.camera.updateMatrixWorld(true);w.aimPoint={x:0,y:0};game.construction.update(false,null,false);game.renderer.render(w.scene,w.camera);};
  game.outpost.habBuild.step=1;w.habBuild.apply();inputTest.aim(w.habBuild.rocks[0]);
 }""")
 before=page.evaluate('JSON.stringify(game.outpost.habBuild.rockHits)')
 page.keyboard.press('KeyE');page.evaluate('inputTest.drain()')
 assert page.evaluate('JSON.stringify(game.outpost.habBuild.rockHits)')==before,'E damaged a habitat rock'
 for _ in range(3):
  page.evaluate('inputTest.aim(game.world.habBuild.rocks[0])');page.mouse.click(640,425);page.evaluate('inputTest.drain()')
 assert page.evaluate('game.outpost.habBuild.cleared.includes(0)'), 'Left click did not clear habitat rock'
 saved=page.evaluate('JSON.stringify(game.outpost.habBuild.rockHits)')
 page.mouse.click(640,425);page.evaluate('inputTest.drain()')
 assert page.evaluate('JSON.stringify(game.outpost.habBuild.rockHits)')==saved,'Removed habitat rock was mined again'
 page.evaluate("()=>{game.outpost.habBuild.step=6;game.world.habBuild.apply();game.outpost.powerStep=2;game.construction.sync();inputTest.aim(game.construction.rubble[0]);}")
 before=page.evaluate('JSON.stringify(game.outpost.construction.rockHits)')
 page.keyboard.press('KeyE');page.evaluate('inputTest.drain()')
 assert page.evaluate('JSON.stringify(game.outpost.construction.rockHits)')==before,'E damaged power-site rock'
 for _ in range(3):
  page.evaluate('inputTest.aim(game.construction.rubble[0])');page.mouse.click(640,425);page.evaluate('inputTest.drain()')
 assert page.evaluate('game.outpost.construction.cleared.includes(0)'), 'Left click did not clear power-site rock'
 page.evaluate("()=>{inputTest.dep=game.colony.deposits.find(d=>d.group.parent&&!game.colony.s.mined.includes(d.id));inputTest.aim(inputTest.dep.group,2.2);}")
 before=page.evaluate('JSON.stringify(game.colony.s.hits)')
 page.keyboard.press('KeyE')
 page.get_by_role('dialog').filter(has=page.locator('h3',has_text='rock inspection')).wait_for(timeout=10000)
 assert page.evaluate('JSON.stringify(game.colony.s.hits)')==before,'E damaged mineral deposit'
 page.screenshot(path=str(out/'rock-inspection.png'))
 page.get_by_role('button',name='Back to the rock',exact=True).click()
 count=page.evaluate('game.colony.s.bag[inputTest.dep.ore]')
 strikes=page.evaluate('inputTest.ORES[inputTest.dep.ore].hits')
 for _ in range(strikes):
  page.evaluate('inputTest.aim(inputTest.dep.group,2.2)');page.mouse.click(640,425);page.evaluate('inputTest.drain()')
 assert page.evaluate('game.colony.s.mined.includes(inputTest.dep.id)'), 'Left click did not mine mineral'
 assert page.evaluate('game.colony.s.bag[inputTest.dep.ore]')-count==page.evaluate('inputTest.ORES[inputTest.dep.ore].yield')
 # Touch buttons must use the same independent mining and inspection routes.
 page.keyboard.press('Escape')
 page.evaluate("()=>{inputTest.dep=game.colony.deposits.find(d=>d.group.parent&&!game.colony.s.mined.includes(d.id));inputTest.aim(inputTest.dep.group,2.2);}")
 before=page.evaluate('JSON.stringify(game.colony.s.hits)')
 page.locator('#t-use').dispatch_event('pointerdown',{'pointerType':'touch','pointerId':8,'button':0,'bubbles':True})
 page.get_by_role('dialog').filter(has=page.locator('h3',has_text='rock inspection')).wait_for(timeout=10000)
 assert page.evaluate('JSON.stringify(game.colony.s.hits)')==before,'Touch Inspect damaged a rock'
 page.get_by_role('button',name='Back to the rock',exact=True).click()
 page.locator('#t-mine').dispatch_event('pointerdown',{'pointerType':'touch','pointerId':9,'button':0,'bubbles':True})
 page.evaluate('inputTest.drain()')
 page.locator('#t-mine').dispatch_event('pointerup',{'pointerType':'touch','pointerId':9,'button':0,'bubbles':True})
 assert page.evaluate('(game.colony.s.hits[inputTest.dep.id]||0)===1'),'Touch Mine did not strike the rock'
 page.keyboard.press('Escape')
 page.evaluate("async()=>{(await import('./src/settings.js')).openSettings({tab:'controls'});}")
 page.get_by_text('Left click with the pickaxe to mine. E inspects rocks and uses other objects.',exact=True).wait_for()
 page.screenshot(path=str(out/'updated-controls.png'))
 result={'touch_mine_and_inspect':True,'E_inspects_without_damage':['habitat','power','mineral'],'left_click_mines':['habitat','power','mineral'],'removed_target_rejected':True,'mineral_yield_preserved':True,'errors':errors}
 assert not errors,errors
 (out/'mining-input.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
