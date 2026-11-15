from pathlib import Path
import argparse,base64,json,sys
parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);a=parser.parse_args();a.out.mkdir(exist_ok=True,parents=True)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'game/animation/trailer/scripts'))
from game_session import open_game,sync_playwright
SCRIPT="""async()=>{
 const T=await import('three'),w=game.world,o=game.outpost,c=game.construction;
 game.renderer.setAnimationLoop(null);o.habBuild.step=6;w.habBuild.apply();o.powerStep=6;o.baseConnected=true;o.chargerStep=3;o.parts=30;o.panels=6;w.setPanels(6);w.settlement.pack.visible=true;w.settlement.charging.visible=true;o.buy('battery');c.bank.update(false,false);c.bank.use(c.bank.nodes[0].ghost);c.update(false,null,false);
 await Promise.all([w.solar.modelsReady,w.settlement.pack.powerModelReady,w.settlement.chargerPost?.powerModelReady,c.bank.nodes[0].body?.powerModelReady]);
 await new Promise(r=>setTimeout(r,500));
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,800);renderer.toneMapping=game.renderer.toneMapping;renderer.outputColorSpace=game.renderer.outputColorSpace;
 const cam=new T.PerspectiveCamera(47,1.6,.05,1800),out={};
 function photo(name,scene,eye,aim){cam.position.copy(eye);cam.lookAt(aim);scene.updateMatrixWorld(true);renderer.render(scene,cam);out[name]=renderer.domElement.toDataURL('image/png');}
 const pack=w.settlement.pack.position;
 photo('solar-and-cabinet',w.scene,pack.clone().add(new T.Vector3(4,4.5,8)),pack.clone().add(new T.Vector3(-3,0,-3)));
 photo('parallel-cabinets',w.scene,pack.clone().add(new T.Vector3(7,4,7)),pack.clone().add(new T.Vector3(1.7,0,-.7)));
 const charger=w.settlement.charging.position.clone().add(new T.Vector3(3.2,0,0));photo('charger',w.scene,charger.clone().add(new T.Vector3(1.6,1.7,2.5)),charger.clone().add(new T.Vector3(0,.7,0)));
 c.begin('array');c.bench.visible=true;await Promise.all(c.slots.map(m=>m.powerModelReady));await new Promise(r=>setTimeout(r,1000));const bench=c.bench.getWorldPosition(new T.Vector3());photo('bench-array',game.interior.scene,bench.clone().add(new T.Vector3(1,1.6,1.6)),bench.clone().add(new T.Vector3(0,.1,0)));

 game.colony.s.held=0;game.colony.equip();await w.viewGloveReady;await new Promise(r=>setTimeout(r,1500));w.updateSwing(0);w.player.visible=false;w.viewSlot.visible=true;
 w.camera.position.copy(pack).add(new T.Vector3(2,1.7,6));w.camera.lookAt(pack.clone().add(new T.Vector3(0,.7,0)));w.camera.updateMatrixWorld(true);
 for(const [name,t] of [['glove-idle',-1],['glove-lift',.3],['glove-impact',.55]]){w.toolSwing=t;w.updateSwing(0);w.scene.updateMatrixWorld(true);renderer.render(w.scene,w.camera);out[name]=renderer.domElement.toDataURL('image/png');}
 renderer.dispose();return out;
}"""
with sync_playwright() as p:
 b,page=open_game(p,w=1280,h=800);out=page.evaluate(SCRIPT)
 for name,data in out.items(): (a.out/(name+'.png')).write_bytes(base64.b64decode(data.split(',')[1]))
 print('Captured '+str(a.out));b.close()
