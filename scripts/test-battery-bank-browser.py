from pathlib import Path
import argparse,base64,json,sys
parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);a=parser.parse_args();a.out.mkdir(exist_ok=True,parents=True)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'game/animation/trailer/scripts'))
from game_session import open_game,sync_playwright
SCRIPT="""async()=>{
 const THREE=await import('three'),w=game.world,o=game.outpost,c=game.construction;
 game.renderer.setAnimationLoop(null);o.habBuild.step=6;w.habBuild.apply();o.powerStep=6;o.baseConnected=true;o.parts=30;o.panels=6;w.settlement.pack.visible=true;
 const before=o.battery;o.buy('battery');c.bank.update(false,false);const n=c.bank.nodes[0],result={before,afterBuy:o.battery,uses:[]};
 function use(obj){obj.updateWorldMatrix(true,false);const pos=obj.getWorldPosition(new THREE.Vector3());w.player.position.copy(pos).add(new THREE.Vector3(0,.3,1.7));w.camera.position.copy(w.player.position).add(new THREE.Vector3(0,.8,0));w.camera.lookAt(pos);w.camera.updateMatrixWorld(true);w.aimPoint={x:0,y:0};c.update(false,null,false);if(c.hit?.object!==obj)throw Error('Miss '+obj.userData.kind+' hit '+c.hit?.object.userData.kind);result.uses.push(c.hit.object.userData.kind);c.use();}
 use(n.ghost);c.update(false,null,false);use(n.check);
 const port=(side,pole)=>n.ports.find(p=>p.userData.side===side&&p.userData.pole===pole);
 use(port('bus','+'));use(port('pack','-'));result.reverseKept=!!c.bank.held;result.afterReverse=o.battery;
 use(port('pack','+'));result.afterRed=o.battery;const partial=JSON.parse(JSON.stringify(o.batteryBank));o.batteryBank=JSON.parse(JSON.stringify(partial));c.bank.update(false,false);if(c.bank.cables.size!==1)throw Error('Partial branch not restored');use(port('bus','-'));use(port('pack','-'));c.update(false,null,false);
 result.afterWired=o.battery;result.connected=o.batteryBank.connected;result.cables=c.bank.cables.size;result.bond=!!c.groundRod;
 const complete=o.batteryBank;o.batteryBank=partial;c.bank.update(false,false);result.visibleAfterRollback=[...c.bank.cables.values()].filter(v=>v.cable.visible).length;o.batteryBank=complete;c.bank.update(false,false);
 use(port('bus','+'));result.afterRepeat=o.battery;
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,760);renderer.toneMapping=game.renderer.toneMapping;renderer.outputColorSpace=game.renderer.outputColorSpace;
 const cam=new THREE.PerspectiveCamera(48,1280/760,.05,1800),p=w.settlement.pack.position;cam.position.copy(p).add(new THREE.Vector3(7,5,8));cam.lookAt(p.clone().add(new THREE.Vector3(2,0,-1)));renderer.render(w.scene,cam);result.photo=renderer.domElement.toDataURL('image/png');renderer.dispose();return result;
}"""
with sync_playwright() as p:
 b,page=open_game(p,w=1280,h=760);result=page.evaluate(SCRIPT)
 (a.out/'parallel-bank.png').write_bytes(base64.b64decode(result.pop('photo').split(',')[1]))
 assert result['before']==result['afterBuy']==result['afterReverse']==result['afterRed'],result
 assert result['visibleAfterRollback']==1 and result['afterRepeat']==result['afterWired'],result
 assert result['afterWired']==result['before']+4 and result['cables']==2 and result['reverseKept'],result
 (a.out/'parallel-bank.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
