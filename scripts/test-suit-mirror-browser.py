"""Exercise the real habitat module, Z-2 actions and reflection/rack transition."""
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
    browser=p.chromium.launch(channel='msedge',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'],env=env)
    page=browser.new_page(viewport={'width':1280,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/game/internal/suit-mirror-preview.html',wait_until='domcontentloaded')
    page.wait_for_function('window.preview?.ready',timeout=120000)
    suited=page.evaluate('''() => {
      const {room}=preview,s=room.mirror.suit;
      return {model:s.model,clips:Object.keys(s.actions),rack:room.rackedSuit.visible,
        suited:s.root.visible,cabin:room.mirror.cabin.visible,
        realistic:room.mirror.cabin.userData.realistic};
    }''')
    assert suited['model']=='Z2' and len(suited['clips'])==9 and suited['suited'] and not suited['cabin'] and not suited['rack'],suited
    page.screenshot(path=str(OUT/'mirror-suited.png'))
    page.click('#store')
    page.wait_for_function('preview.room.mirror.cabin.visible && preview.room.rackedSuit.visible')
    page.screenshot(path=str(OUT/'mirror-cabin.png'))
    unsuited=page.evaluate('''() => {
      const {room}=preview,m=room.mirror;let mesh;
      m.cabin.traverse(o=>{if(o.isMesh&&!mesh)mesh=o});
      return {rack:room.rackedSuit.visible,suited:m.suit.root.visible,cabin:m.cabin.visible,
       realistic:m.cabin.userData.realistic,playerModel:m.cabin.userData.playerModel,mainSeesBody:room.camera.layers.test(mesh.layers),
       mirrorSeesBody:m.surface.camera.layers.test(mesh.layers),position:room.pos.toArray()};
    }''')
    assert unsuited['rack'] and unsuited['cabin'] and not unsuited['suited'] and unsuited['realistic'],unsuited
    assert unsuited['playerModel']=='player-cabin',unsuited
    assert not unsuited['mainSeesBody'] and unsuited['mirrorSeesBody'],unsuited
    cabin_motion=page.evaluate('''() => {
      const r=preview.room,m=r.mirror;let head,foot,hip;
      m.cabin.traverse(o=>{if(!o.isBone)return;if(/Head$/.test(o.name))head=o;
        if(/LeftFoot$/.test(o.name))foot=o;if(/LeftUpLeg$/.test(o.name))hip=o;});
      const old=hip.quaternion.clone();r.vel.x=1.4;
      for(let i=0;i<50;i++)m.update(.02);
      m.cabin.updateWorldMatrix(true,true);
      const result={walkWeight:m.cabinActions.Walk.getEffectiveWeight(),
        legMoved:old.angleTo(hip.quaternion)>.02,
        headHeight:head.getWorldPosition(head.position.clone()).y,
        footHeight:foot.getWorldPosition(foot.position.clone()).y};
      r.vel.x=0;for(let i=0;i<70;i++)m.update(.02);
      return result;
    }''')
    assert abs(cabin_motion['walkWeight']-1.4/1.5)<.01 and cabin_motion['legMoved'],cabin_motion
    assert 1.2<cabin_motion['headHeight']-cabin_motion['footHeight']<1.9,cabin_motion
    page.evaluate('preview.room.placeAt(-2.6,1.65);preview.room.pitch=0')
    page.screenshot(path=str(OUT/'mirror-face.png'))
    page.evaluate('preview.room.lookInMirror()')
    motion=page.evaluate('''async () => {
      const {loadNasaAstronaut,poseAstronaut}=await import('./src/suit.js');
      const a=await loadNasaAstronaut(),b=await loadNasaAstronaut();
      const old=b.hips[0].quaternion.toArray();
      for(let i=0;i<20;i++)poseAstronaut(a,{phase:1.1,pace:1,run:0,air:0,t:i*.04});
      return {independent:a.hips[0]!==b.hips[0],walkWeight:a.actions.Walk.getEffectiveWeight(),
       stayed:old.every((v,i)=>Math.abs(v-b.hips[0].quaternion.toArray()[i])<1e-6),
       moved:Math.abs(a.hips[0].quaternion.x-b.hips[0].quaternion.x)>0.01};
    }''')
    assert motion['independent'] and motion['stayed'] and motion['moved'] and motion['walkWeight']>.9,motion
    moon=page.evaluate('''async () => {
      const THREE=await import('three'),{Astronaut}=await import('./moon/src/player.js');
      const astronaut=new Astronaut(new THREE.Scene());
      for(let i=0;i<250&&!astronaut.rig;i++)await new Promise(r=>setTimeout(r,40));
      astronaut.update(.016,{x:0,z:0,run:false,jump:false,crouch:false},0,[],null,null,null);
      return {model:astronaut.rig?.model,actions:Object.keys(astronaut.rig?.actions??{})};
    }''')
    assert moon['model']=='Z2' and len(moon['actions'])==9,moon
    page.click('#wear');page.wait_for_function('!preview.room.rackedSuit.visible && preview.room.mirror.suit.root.visible')
    assert not errors,errors
    report={'suited':suited,'unsuited':unsuited,'cabin_motion':cabin_motion,'motion':motion,'moon':moon,'errors':errors}
    (OUT/'suit-mirror-check.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report),flush=True)
    browser.close()
server.shutdown()
