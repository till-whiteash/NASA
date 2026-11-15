"""Full game: staged ISRU, shelter clearance, GPU recovery and permanent oxygen death."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
from browser_test_server import start_server
server=start_server()
url=f'http://127.0.0.1:{server.server_port}/game/?graphics=low#debug'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge',headless=True)
  page=browser.new_page(viewport={'width':1000,'height':700});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.wait_for_function('window.game !== undefined')
  seed=page.evaluate('''async()=>{
    const {Outpost}=await import('./src/sim.js'),{newColony}=await import('./src/colony.js');
    const facts=(await (await fetch('data/mars-facts.json')).json()).facts;
    const o=new Outpost('normal',facts,'gusev');Object.assign(o,{habBuild:null,powerStep:6,baseConnected:true,safetyChecks:{reserves:true,shelter:true},research:{relay:3},food:100});
    const c=newColony();c.farmQuest={rewarded:true};c.belt=['pickaxe','builder'];c.held=1;
    return {v:1,difficulty:'normal',outpost:o,colony:c,inside:false,solClock:150,solSeconds:300,suit:1,pending:[],tutorialStep:0,sunsetShown:true,logbook:[],world:{player:[0,10],yaw:0,pickups:[],sev:[-34,26,0,1]}};
  }''')
  def resume(data=None):
   if data is not None:page.evaluate('(d)=>localStorage.setItem("zhetalis-unity-mars-save-v1",JSON.stringify(d))',data)
   page.reload();page.locator('#resume').click();page.wait_for_function('game.world?.settlement && !document.querySelector("#hud").classList.contains("hidden")',timeout=120000)
  resume(seed)
  result=page.evaluate('''()=>{
    const w=game.world,o=game.outpost,res=[];const empty=w.colliders.length;
    for(let i=0;i<5;i++){const t=game.mission.objective(),p=game.mission.target(t.target);w.player.position.x=p.x;w.player.position.z=p.z;document.activeElement?.blur();dispatchEvent(new KeyboardEvent('keydown',{key:'e',code:'KeyE',bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{key:'e',code:'KeyE',bubbles:true}));res.push({stage:o.isruStep,pad:w.settlement.isru.pad.visible,equipment:w.settlement.isru.equipment.visible,cable:w.settlement.isru.cable.visible,colliders:w.colliders.length});}
    dispatchEvent(new Event('pagehide'));return {empty,res};
  }''')
  assert [x['stage'] for x in result['res']]==[1,2,3,4,5],result
  assert not result['res'][0]['pad'] and result['res'][1]['pad']
  assert result['res'][0]['colliders']==result['res'][1]['colliders']==result['empty']
  assert result['res'][2]['colliders']>result['empty'] and result['res'][3]['cable']
  resume();assert page.evaluate('game.outpost.isruStep===5 && game.world.settlement.isru.equipment.visible')
  counts=page.evaluate('''()=>{const s=game.world.settlement,r=game.renderer,w=game.world,a=[];for(let n=0;n<12;n++){s.greenhouseKey='test-'+n;s.updateGreenhouse(game.colony.s.base,true);r.render(w.scene,w.camera);a.push(r.info.memory.geometries);}return a;}''')
  assert len(set(counts))==1,counts
  clearance=page.evaluate('''()=>{game.goInside();const i=game.interior,m=i.shelterRoom.frame;i.pos.set(0,0,-.8).applyMatrix4(m);return [-.9,-.6,0,.5,.8].map(x=>{const p=i.pos.clone().set(x,0,-1).applyMatrix4(m);return i.walkable(p.x,p.z)});}''')
  assert clearance==[False,False,True,False,False],clearance
  page.evaluate("game.renderer.getContext().getExtension('WEBGL_lose_context').loseContext()")
  page.locator('#graphics-recovery').wait_for();assert page.evaluate('!!localStorage.getItem("zhetalis-unity-mars-save-v1")')
  page.locator('#graphics-recovery button').click();page.wait_for_function('window.game && !game.world')
  resume(seed)
  page.evaluate('game.suit=0')
  page.get_by_role('heading',name='You died',exact=True).wait_for()
  assert not page.evaluate('!!localStorage.getItem("zhetalis-unity-mars-save-v1")')
  assert not page.locator('.modal-dismiss').is_visible()
  page.keyboard.press('Escape');assert page.get_by_role('heading',name='You died',exact=True).is_visible()
  page.evaluate("dispatchEvent(new Event('pagehide'))");page.wait_for_timeout(5200)
  assert not page.evaluate('!!localStorage.getItem("zhetalis-unity-mars-save-v1")')
  page.get_by_role('button',name='Main menu',exact=True).click();page.wait_for_function('window.game && !game.world')
  assert page.locator('#title').is_visible() and not page.locator('#resume').is_visible()
  resume(seed);page.evaluate('game.suit=0');page.get_by_role('heading',name='You died',exact=True).wait_for()
  page.get_by_role('button',name='Retry — new mission',exact=True).click()
  page.wait_for_function('window.game && !location.search.includes("newMission") && !document.querySelector("#title").classList.contains("hidden") === false')
  assert not page.evaluate('!!localStorage.getItem("zhetalis-unity-mars-save-v1")')
  assert not errors,errors
  print(json.dumps({'isru':result,'geometryCounts':counts,'shelterClearance':clearance,'deathMenuRetryRecovery':'passed','pageErrors':errors}))
  browser.close()
finally:server.shutdown()
