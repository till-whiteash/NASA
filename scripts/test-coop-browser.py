"""Exercise an existing co-op build with isolated Playwright player contexts.

Run a relay separately, then: python scripts/test-coop-browser.py --port 18891
No existing browser profiles or player saves are touched.
"""
from pathlib import Path
import argparse, json, os, time, traceback
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=18891)
parser.add_argument('--software',action='store_true')
args=parser.parse_args()
OUT=Path('C:/Users/Lenovo/.codex/visualizations/2026/11/13/01a1d56b-ef59-7f00-bbce-93101280eea1')
URL=f'http://127.0.0.1:{args.port}/?graphics=low&relay=ws://127.0.0.1:{args.port}/coop#debug'
SAVE='zhetalis-unity-mars-save-v1'
SENTINEL='{"testSentinel":"guest-own-mission-preserved"}'
report={'url':URL,'checks':[],'errors':[],'console_errors':[]}
def record(name,data=None):
    report['checks'].append({'name':name,'passed':True,'data':data})
    print('PASS '+name+(' '+json.dumps(data) if data is not None else ''),flush=True)
def check(name,fn):
    try:record(name,fn())
    except Exception as e:
        report['checks'].append({'name':name,'passed':False,'error':str(e)})
        print('FAIL '+name+' '+str(e),flush=True)
def until(page,expr,arg=None,timeout=20000):
    page.wait_for_function(expr,arg=arg,timeout=timeout)

with sync_playwright() as p:
    env={k:v for k,v in os.environ.items() if k.upper() in ['SYSTEMROOT','WINDIR','COMSPEC','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATH']}
    browser=p.chromium.launch(channel='msedge',headless=True,env=env,args=(
        ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] if args.software else [])+[
        '--disable-background-timer-throttling','--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'])
    contexts=[]
    def player(name):
        ctx=browser.new_context(viewport={'width':1100,'height':760},device_scale_factor=1,reduced_motion='reduce')
        contexts.append(ctx)
        page=ctx.new_page();page.set_default_timeout(30000)
        page.on('pageerror',lambda e:report['errors'].append({'player':name,'error':str(e)}))
        page.on('console',lambda m:report['console_errors'].append({'player':name,'error':m.text}) if m.type=='error' else None)
        page.goto(URL,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_load_state('networkidle',timeout=90000)
        page.locator('#coop-btn').wait_for(state='visible',timeout=90000)
        report.setdefault('renderers',{})[name]=page.evaluate('''() => {
          const gl=document.querySelector('canvas').getContext('webgl2');
          const ext=gl?.getExtension('WEBGL_debug_renderer_info');
          return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';
        }''')
        print('READY '+name,flush=True)
        return page
    try:
        host=player('Host')
        report['title_buttons']=host.get_by_role('button').all_text_contents()
        host.locator('#coop-btn').click();host.locator('#coop-name').fill('Test Host')
        host.locator('#coop-create').click()
        host.locator('#coop-go').wait_for(state='visible')
        code=host.evaluate('game.coop.code');report['room_code']=code
        assert len(code)==5
        host.screenshot(path=str(OUT/'coop-lobby.png'))
        record('Create room through menu',{'code':code})
        guest=player('Guest')
        guest.evaluate('([k,v])=>localStorage.setItem(k,v)',[SAVE,SENTINEL])
        guest.locator('#coop-btn').click();guest.locator('#coop-name').fill('Test Guest')
        guest.locator('#coop-code').fill('ZZZZZ');guest.locator('#coop-join').click()
        guest.get_by_role('status').filter(has_text='No game with that code').wait_for(state='visible')
        record('Invalid room code gives explanation')
        guest.locator('#coop-code').fill(code.lower());guest.locator('#coop-join').click()
        until(guest,'game.coop.active && game.coop.guest')
        until(host,'game.coop.peers.size===1')
        record('Guest joins through menu before host lands')
        host.locator('#coop-go').click()
        host.locator('#skip').click(timeout=90000)
        host.wait_for_function('window.game?.world?.settlement',timeout=120000)
        print('HOST_WORLD',flush=True)
        host.locator('#arrival [data-region]').first.click(timeout=120000)
        host.locator('#arrival [data-confirm]').click()
        for _ in range(6):
            if not host.locator('#arrival').count():break
            skip=host.locator('#arrival [data-skip]')
            if skip.is_visible():skip.click()
            host.wait_for_timeout(300)
        until(host,'!document.querySelector("#arrival")',timeout=90000)
        host.get_by_role('button',name="Let's go!",exact=True).click(timeout=120000)
        until(guest,'game.world && game.outpost && !document.querySelector("#coop-dialog") && !document.querySelector("#hud").classList.contains("hidden")',timeout=120000)
        until(host,'[...game.coop.peers.values()].every(p=>p.pose?.w==="out")',timeout=60000)
        until(guest,'game.remote.list.size===1 && [...game.remote.list.values()][0].pose?.w==="out"',timeout=60000)
        record('Both players land with host snapshot')
        host_id=host.evaluate('game.coop.id');guest_id=guest.evaluate('game.coop.id')
        report['players']={'host':host_id,'guest':guest_id}
        def movement(sender,receiver,remote_id):
            sender.bring_to_front()
            sender.locator('#view').click(position={'x':800,'y':300})
            before=sender.evaluate('game.world.player.position.toArray()')
            sender.keyboard.down('KeyW')
            try:until(sender,'p=>Math.hypot(game.world.player.position.x-p[0],game.world.player.position.z-p[2])>1.1',before,timeout=60000)
            finally:sender.keyboard.up('KeyW')
            sender.wait_for_timeout(500)
            after=sender.evaluate('game.world.player.position.toArray()')
            distance=sum((after[i]-before[i])**2 for i in [0,2])**.5
            assert distance>.5,{'before':before,'after':after,'distance':distance}
            until(receiver,'a=>{const p=game.coop.peers.get(a.id)?.pose;return p&&Math.hypot(p.x-a.x,p.z-a.z)<.6}',{'id':remote_id,'x':after[0],'z':after[2]})
            until(receiver,'a=>{const p=game.remote.list.get(a.id)?.root.position;return p&&Math.hypot(p.x-a.x,p.z-a.z)<.7}',{'id':remote_id,'x':after[0],'z':after[2]})
            return {'distance':round(distance,2),'remote_pose_and_avatar_match':True}
        check('Host keyboard movement reaches guest',lambda:movement(host,guest,host_id))
        check('Guest keyboard movement reaches host',lambda:movement(guest,host,guest_id))
        def jumping():
            guest.evaluate('window.__jumpSeen=false;game.coop.on("pose",(id,p)=>{if(p.g===0)__jumpSeen=true})')
            host.bring_to_front();host.keyboard.down('Space')
            try:until(host,'!game.world.onGround',timeout=30000)
            finally:host.keyboard.up('Space')
            until(guest,'window.__jumpSeen',timeout=30000)
            return True
        check('Jump reaches other player',jumping)
        def resources():
            host_bag=host.evaluate('game.colony.s.bag.iron')
            start=host.evaluate('game.colony.s.store.iron')
            n=guest.evaluate('game.colony.s.bag.iron+=2;game.colony.unload()')
            until(host,'n=>game.colony.s.store.iron===n',start+2)
            assert host.evaluate('game.colony.s.bag.iron')==host_bag
            guest_bag=guest.evaluate('game.colony.s.bag.iron')
            assert guest_bag==0
            host.evaluate('game.outpost.parts+=1')
            parts=host.evaluate('game.outpost.parts')
            until(guest,'n=>game.outpost.parts===n',parts)
            return {'unloaded':n,'shared_iron':start+2,'shared_parts':parts,'personal_bags_separate':True}
        check('Shared storage and supplies sync both ways',resources)
        def avatar_photo():
            guest.wait_for_timeout(800)
            host.evaluate('''() => {const w=game.world,a=[...game.remote.list.values()][0];
              if(a?.root){const pos=a.root.position;w.camera.position.set(pos.x+3,pos.y+2.4,pos.z+4);w.camera.lookAt(pos.x,pos.y+1,pos.z);game.renderer.render(w.scene,w.camera);}}''')
            host.screenshot(path=str(OUT/'coop-host-game.png'))
            guest.screenshot(path=str(OUT/'coop-guest-game.png'))
            return {'host_photo':'coop-host-game.png','guest_photo':'coop-guest-game.png'}
        check('Capture both game views',avatar_photo)
        def indoors():
            host.evaluate('game.goInside()');guest.evaluate('game.goInside()')
            until(host,'[...game.coop.peers.values()][0]?.pose?.w==="hab"')
            until(guest,'[...game.coop.peers.values()][0]?.pose?.w==="hab"')
            until(host,'[...game.remote.list.values()][0]?.root.parent===game.interior.scene')
            host.screenshot(path=str(OUT/'coop-habitat.png'))
            return True
        check('Both astronauts enter shared habitat',indoors)
        def night():
            host.evaluate('game.phase(.8)');guest.evaluate('game.phase(.8)')
            sol=host.evaluate('game.outpost.sol')
            host.keyboard.press('KeyN');host.wait_for_timeout(1300)
            assert host.evaluate('game.outpost.sol')==sol,'one vote incorrectly skipped the night'
            guest.keyboard.press('KeyN')
            until(host,'s=>game.outpost.sol>s',sol,timeout=30000)
            until(guest,'s=>game.outpost.sol>s',sol,timeout=20000)
            return {'old_sol':sol,'host_sol':host.evaluate('game.outpost.sol'),'guest_sol':guest.evaluate('game.outpost.sol')}
        check('Two-player night vote requires both, then skips together',night)
        def save_untouched():
            value=guest.evaluate('(k)=>localStorage.getItem(k)',SAVE)
            assert value==SENTINEL,value
            return True
        check('Guest original save is untouched',save_untouched)
        def handover():
            host.context.close();until(guest,'game.coop.isHost && game.coop.peers.size===0')
            before=guest.evaluate('game.sleep.clock');guest.wait_for_timeout(1300)
            after=guest.evaluate('game.sleep.clock')
            assert after>before,{'before':before,'after':after}
            return {'guest_became_host':True,'clock_advanced':after-before}
        check('Disconnect host: guest takes over and clock continues',handover)
        def late_join():
            late=player('Late Join');late.locator('#coop-btn').click()
            late.locator('#coop-name').fill('Late Join');late.locator('#coop-code').fill(code);late.locator('#coop-join').click()
            until(late,'game.world && game.coop.guest && !document.querySelector("#coop-dialog")',timeout=120000)
            until(guest,'game.coop.peers.size===1')
            return {'new_guest_joined_replacement_host':True}
        check('New player joins after host handover',late_join)
    except Exception as e:
        report['fatal']={'error':str(e),'traceback':traceback.format_exc()}
        print('FATAL '+str(e),flush=True)
        for i,ctx in enumerate(contexts):
            try:ctx.pages[0].screenshot(path=str(OUT/f'coop-failure-{i}.png'))
            except Exception:pass
    finally:
        report['passed']=not report.get('fatal') and all(c['passed'] for c in report['checks']) and not report['errors']
        (OUT/'coop-browser-report.json').write_text(json.dumps(report,indent=2))
        print(json.dumps(report),flush=True)
        browser.close()
if not report['passed']:raise SystemExit(1)
