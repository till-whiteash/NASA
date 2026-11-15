"""In-game asset consistency, fitted/held parts, dust, reload/low preset and EVA grip checks."""
from pathlib import Path
import argparse,base64,json,sys,time
parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);a=parser.parse_args();a.out.mkdir(exist_ok=True,parents=True)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'game/animation/trailer/scripts'))
from game_session import open_game,sync_playwright
SETUP="""async()=>{
 const T=await import('three'),w=game.world,o=game.outpost,c=game.construction;game.renderer.setAnimationLoop(null);
 o.habBuild.step=6;w.habBuild.apply();o.powerStep=6;o.baseConnected=true;o.chargerStep=3;o.parts=30;o.panels=6;w.setPanels(6);w.settlement.pack.visible=true;w.settlement.charging.visible=true;
 if(!o.upgrades.battery)o.buy('battery');c.bank.update(false,false);const n=c.bank.nodes[0];c.bank.use(n.ghost);c.bank.update(false,false);
 await Promise.all([w.solar.modelsReady,w.settlement.pack.powerModelReady,w.settlement.chargerPost.powerModelReady,w.settlement.chargerPost.connectorReady,n.body.powerModelReady]);c.update(false,null,false);
 const out={};out.assets={solar:w.solar.group.userData.powerAssetState,pack:w.settlement.pack.userData.powerAssetState,charger:w.settlement.chargerPost.userData.powerAssetState,extra:n.body.userData.powerAssetState};
 out.meshes=0;w.solar.panels[0].powerVisual.traverse(m=>{if(m.isMesh&&m.visible)out.meshes++;});
 const surface=w.solar.panels[0].children[0];w.solar.group.updateMatrixWorld(true);const p=w.solar.panels[0].getWorldPosition(new T.Vector3());out.panelHeight=w.panelHeight(p.x,p.z);
 w.setPanelDust(.15);out.dust=w.solar.group.userData.fieldCellMaterials.map(m=>m.userData.dust.value);w.setPanelDust(1);
 for(const step of [0,2,3,5,6]){o.powerStep=step;w.setPanels(step>=3?3:0);c.update(false,null,false);if(w.solar.panels.some(p=>p.userData.powerAssetState!=='ready'))throw Error('Model changed with progression');}o.powerStep=6;w.setPanels(6);
 c.begin('battery');c.held='Battery module';c.update(true,game.interior,false);await Promise.all(c.slots.map(p=>p.powerModelReady));c.update(true,game.interior,false);
 out.heldReady=c.heldDisplay.children[0].children.some(m=>m.userData.powerAsset==='battery-module');
 const slot=c.slots.find(m=>m.userData.kind==='slot'&&m.userData.name==='Battery module');c.hit={object:slot};c.use();c.update(true,game.interior,false);out.fittedVisible=slot.powerVisual.visible&&!slot.material.visible;
 c.cancel();c.kind=null;c.bench.visible=false;
 game.colony.s.belt[0]='pickaxe';game.colony.equip(0);await w.viewGloveReady;await new Promise(r=>setTimeout(r,1600));w.updateSwing(0);
 const holder=w.viewSlot.children.find(m=>m.userData.toolKind==='pickaxe');out.glove=!!holder?.glove?.userData.aligned;out.gripCentre=holder?.glove?.userData.gripCentre;
 w.player.visible=false;w.firstPerson=true;w.viewSlot.visible=true;w.camera.position.copy(p).add(new T.Vector3(2,1.8,4));w.camera.lookAt(p.clone().add(new T.Vector3(0,.5,0)));w.camera.updateMatrixWorld(true);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,800);renderer.toneMapping=game.renderer.toneMapping;renderer.outputColorSpace=game.renderer.outputColorSpace;
 const cam=new T.PerspectiveCamera(47,1.6,.05,1800);out.photos={};
 function photo(name,eye,aim){cam.position.copy(eye);cam.lookAt(aim);w.scene.updateMatrixWorld(true);renderer.render(w.scene,cam);out.photos[name]=renderer.domElement.toDataURL('image/png');}
 const pack=w.settlement.pack.position;photo('solar-front',pack.clone().add(new T.Vector3(-5,5,-11)),pack.clone().add(new T.Vector3(-5,.5,-2)));
 const charger=w.settlement.charging.position.clone().add(new T.Vector3(3.2,0,0));photo('charger-refined',charger.clone().add(new T.Vector3(1.6,1.7,2.5)),charger.clone().add(new T.Vector3(0,.7,0)));
 for(const [name,t] of [['glove-idle',-1],['glove-lift',.3],['glove-impact',.55]]){w.toolSwing=t;w.updateSwing(0);w.scene.updateMatrixWorld(true);renderer.render(w.scene,w.camera);out.photos[name]=renderer.domElement.toDataURL('image/png');}
 w.toolSwing=-1;w.updateSwing(0);out.homeRestored=w.viewSlot.position.equals(w.viewHome);
 renderer.dispose();c.save();out.saved=!!localStorage.getItem('zhetalis-unity-mars-save-v1');return out;
}"""
def save_photos(result,suffix=''):
 for name,data in result.pop('photos',{}).items():(a.out/(name+suffix+'.png')).write_bytes(base64.b64decode(data.split(',')[1]))
with sync_playwright() as p:
 b,page=open_game(p,w=1280,h=800);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 deadline=time.monotonic()+150
 while time.monotonic()<deadline:
  if page.evaluate('!!game.inside && !!game.outpost?.habBuild?.pioneer'):break
  page.evaluate("""()=>{const pick=document.querySelector('#arrival [data-region="gusev"]:not(:disabled)');if(pick){pick.click();document.querySelector('#arrival [data-confirm]').click();return;}for(const s of ['#arrival [data-skip]','.cinematic:not(.cine-out) .cine-skip','.scene-cinematic .cs-skip','#skip']){const e=document.querySelector(s);if(e&&e.getClientRects().length&&!e.hidden&&!e.disabled){e.click();return;}}}""")
  page.wait_for_timeout(500)
 else:raise AssertionError('Arrival timed out')
 result=page.evaluate(SETUP);save_photos(result)
 assert all(v=='ready' for v in result['assets'].values()),result
 assert result['fittedVisible'] and result['heldReady'] and result['glove'] and result['homeRestored'],result
 assert result['meshes']<25 and result['panelHeight']>-100 and result['dust']==[.85],result
 assert result['saved'],result
 page.evaluate("()=>{localStorage.setItem('mars-graphics','low');window.__resetting=true;}");page.reload(wait_until='networkidle');page.locator('#resume').click();page.wait_for_function('game.construction && game.outpost.powerStep===6',timeout=180000)
 low=page.evaluate(SETUP);save_photos(low,'-low');assert all(v=='ready' for v in low['assets'].values()) and low['fittedVisible'] and low['glove'],low
 result['lowReload']=low;result['errors']=errors;(a.out/'model-checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8');assert not errors,errors;print(json.dumps(result));b.close()
