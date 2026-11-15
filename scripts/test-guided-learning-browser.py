"""Check the guided opening, real interaction ray, power UI and saved reflections.

Diagnostic positioning avoids walking time; this is not a timed usability study.
"""
from pathlib import Path
import argparse, functools, http.server, json, sys, threading, time

parser = argparse.ArgumentParser()
parser.add_argument('--out', type=Path, required=True)
out = parser.parse_args().out
out.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'game/animation/trailer/scripts'))
from game_session import Quiet, sync_playwright

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'])
    page = browser.new_page(viewport={'width':1280, 'height':720})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/block-island.stl', lambda r: r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/game/?graphics=low#debug', wait_until='networkidle', timeout=120000)
    started = time.monotonic()
    page.locator('#guided-start').click()
    page.get_by_role('dialog', name='Your first job: leave the pod', exact=True).wait_for(timeout=240000)
    page.get_by_role('button', name='Find the hatch', exact=True).click()
    page.wait_for_function('game.capsule.hatchMarker?.visible')
    assert page.locator('.cinematic').count() == 0
    assert page.evaluate('game.mission.objective().id') == 'hab-exit'
    page.screenshot(path=str(out/'guided-pod.png'))
    # Use the actual hatch station and pressure-cycle state; shorten only the wait.
    page.evaluate("game.station('ship-exit')")
    page.wait_for_function('!!game.airlock')
    page.evaluate("game.airlock.cycle.tick(60);game.station('airlock-control')")
    page.wait_for_function('!game.inside && game.outpost.habBuild.pioneer.exitedPod')
    before = page.evaluate('({air:game.suit,clock:game.sleep.clock})')
    page.wait_for_timeout(1800)
    assert page.evaluate('({air:game.suit,clock:game.sleep.clock})') == before
    page.evaluate("""async()=>{
      const THREE=await import('three');
      window.usePracticeObject=(obj,offset)=>{
        const w=game.world,c=game.construction,pos=obj.position.clone().add(new THREE.Vector3(0,offset,0));
        w.player.position.copy(pos).add(new THREE.Vector3(0,-.1,2));
        w.camera.position.copy(w.player.position).add(new THREE.Vector3(0,1.25,0));
        w.camera.lookAt(pos);w.camera.updateMatrixWorld(true);w.aimPoint={x:0,y:0};c.update(false,null,false);
        if(c.hit?.object!==obj)throw Error('Interaction ray missed '+obj.userData.kind);
        c.use();
      };
      usePracticeObject(game.world.habBuild.cargo[0],.4);
    }""")
    assert page.evaluate('game.mission.objective().id') == 'hab-starter'
    stock = page.evaluate('JSON.stringify(game.outpost.habBuild.pioneer.stock)')
    page.evaluate('usePracticeObject(game.world.habBuild.starter,.9)')
    assert page.evaluate('game.outpost.habBuild.pioneer.starterBuilt')
    assert page.evaluate('JSON.stringify(game.outpost.habBuild.pioneer.stock)') == stock
    assert page.evaluate('game.outpost.learning.entries[0].kind') == 'build'
    assert page.evaluate('game.mission.objective().id') == 'hab-salvage'
    page.wait_for_timeout(1600)
    assert page.evaluate('game.sleep.clock') > before['clock']
    assert page.evaluate('game.suit') < before['air']
    page.screenshot(path=str(out/'first-build.png'))
    elapsed = round(time.monotonic() - started, 1)
    # A prepared later-game state tests the actual console, crop tick and debrief.
    page.evaluate("""()=>{
      game.goInShip();const o=game.outpost;o.habBuild.step=6;o.baseConnected=true;o.powerStep=6;
      o.battery=12;o.panels=6;o.emergencyKWh=0;o.clean=1;o.o2=80;o.food=100;o.dust=0;o.hazards=[];
      Object.assign(game.colony.s.base[0],{crop:'lettuce',tank:20,grown:0,ready:false});
      o.today=o.forecast();game.station('console');
    }""")
    page.locator('input[data-k="life"]').focus()
    page.keyboard.press('Home')
    assert page.evaluate('game.outpost.split.life') == 0
    assert page.evaluate('game.outpost.learning.entries.at(-1).kind') == 'decision'
    assert 'Grow lights' in page.locator('#power-explanation').inner_text()
    page.get_by_role('button', name='Done', exact=True).click()
    sol = page.evaluate('game.outpost.sol')
    page.evaluate('game.phase(.999)')
    page.wait_for_function('(sol)=>game.outpost.sol>sol', arg=sol, timeout=15000)
    assert page.evaluate('game.colony.s.base[0].grown') == 0
    page.wait_for_function("game.outpost.learning.entries.some(e=>e.key==='crop-power')")
    page.keyboard.press('Escape')
    page.keyboard.press('KeyL')
    page.get_by_role('button', name='Review my decisions', exact=True).click()
    entry = page.locator('.learning-entry').filter(has_text='Grow lights have too little power')
    entry.locator('[data-answer="0"]').click()
    assert 'Try another explanation' in entry.locator('.learning-feedback').inner_text()
    entry.locator('[data-answer="1"]').click()
    assert 'You connected' in entry.locator('.learning-feedback').inner_text()
    page.screenshot(path=str(out/'decision-debrief.png'))
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(300)
    assert page.locator('.modal-box').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.screenshot(path=str(out/'decision-debrief-phone.png'))
    saved = page.evaluate('JSON.stringify(game.outpost.learning)')
    page.keyboard.press('Escape')
    page.set_viewport_size({'width':1280,'height':720})
    page.reload(wait_until='networkidle')
    page.locator('#resume').click()
    page.wait_for_function('game.inside && game.outpost?.learning?.entries.length>0', timeout=180000)
    assert json.loads(page.evaluate('JSON.stringify(game.outpost.learning)')) == json.loads(saved)
    assert not errors, errors
    result = {'guidedStart':True,'hatchMarker':True,'practicePaused':True,'rayBuild':True,'materialsConserved':True,'survivalResumed':True,'diagnosticFirstBuildSeconds':elapsed,'powerChoiceRecorded':True,'actualCropOutcome':True,'reflectionRetry':True,'phoneFits':True,'saveReload':True,'errors':errors}
    (out/'guided-learning.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))
    browser.close()
server.shutdown()
