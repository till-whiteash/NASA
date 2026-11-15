"""Exercise salvage and calibration through the normal first-person interaction ray."""
from pathlib import Path
import argparse,base64,json,sys
parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);a=parser.parse_args();a.out.mkdir(exist_ok=True,parents=True)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'game/animation/trailer/scripts'))
from game_session import open_game,sync_playwright
SCRIPT="""async()=>{
 const THREE=await import('three'),w=game.world,o=game.outpost,h=w.habBuild,c=game.construction;
 game.renderer.setAnimationLoop(null);const b=o.habBuild,p=b.pioneer;
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,760);renderer.toneMapping=game.renderer.toneMapping;renderer.outputColorSpace=game.renderer.outputColorSpace;
 function photo(point){const cam=new THREE.PerspectiveCamera(54,1280/760,.05,1800);cam.position.set(point.x+10,point.y+6,point.z+15);cam.lookAt(point.x,point.y+1,point.z);renderer.render(w.scene,cam);return renderer.domElement.toDataURL('image/png');}
 function use(obj,offset=.4){const pos=obj.position.clone().add(new THREE.Vector3(0,offset,0));w.player.position.copy(pos).add(new THREE.Vector3(0,-.1,2));w.camera.position.copy(w.player.position).add(new THREE.Vector3(0,1.25,0));w.camera.lookAt(pos);w.camera.updateMatrixWorld(true);w.aimPoint={x:0,y:0};c.update(false,null,false);const kind=c.hit?.object.userData.kind;if(c.hit?.object!==obj)throw Error('Ray missed '+obj.userData.kind+'; picked '+kind);if(['hab-rock','rubble'].includes(kind))c.mine();else c.use();return kind;}
 const result={start:game.mission.objective().id,firstPerson:w.firstPerson,cargo:[],survey:[]};
 p.exitedPod=true;h.apply();result.cargoPhoto=photo(h.cargo[1].position);
 for(const obj of h.cargo)result.cargo.push(use(obj));
 if(p.collected.length!==6)throw Error('Missing cargo');
 use(h.starter,.9);if(!p.starterBuilt)throw Error('Missing starter build');
 result.surveyPhoto=photo(h.surveys[1].position);
 use(h.surveys[0],1.4);w.player.position.x+=10;h.update(.2);if(h.measuring)throw Error('Survey did not cancel');
 for(const obj of h.surveys){use(obj,1.4);for(let n=0;n<32;n++)h.update(.1);result.survey.push(p.surveyed.includes(obj.userData.id));}
 if(p.surveyed.length!==3)throw Error('Survey not saved');
 b.step=2;b.cleared=[0,1,2,3];h.apply();
 for(const pad of h.pads){h.use(pad);for(let n=0;n<14;n++)h.update(.1);}
 if(b.frames.length!==6)throw Error('Missing frames');result.framesPhoto=photo(new THREE.Vector3(h.centre.x,0,h.front-12));
 h.use(h.post);for(let n=0;n<32;n++)h.update(.1);h.use(h.airlock);h.use(h.valve);w.player.position.copy(h.valve.position);for(let n=0;n<85;n++)h.update(.1);
 if(b.step!==6)throw Error('Habitat not finished');
 result.stock=p.stock;result.spent=p.spent;result.step=b.step;result.finishedPhoto=photo(new THREE.Vector3(h.centre.x,0,h.front-10));
 const completeBuild=o.habBuild;h.unfold();h.rise(h.frames[0]);o.habBuild=JSON.parse(JSON.stringify(completeBuild));h.apply(true);if(h.anim||h.growing.length||!h.m.model.scale.equals(h.model.scale)||h.frames[0].scale.y!==1)throw Error('Snapshot kept partial animation');result.snapshotRestoresScale=true;
 const legacy={step:2,cleared:[0,1,2,3],rockHits:{},frames:[],pressure:0};o.habBuild=legacy;h.apply();h.use(h.pads[0]);result.legacyFrame=legacy.frames.includes(0);o.habBuild=b;h.apply();
 renderer.dispose();return result;
}"""
with sync_playwright() as p:
 b,page=open_game(p,w=1280,h=760)
 result=page.evaluate(SCRIPT)
 for key in list(result):
  if key.endswith('Photo'):
   (a.out/(key+'.png')).write_bytes(base64.b64decode(result.pop(key).split(',')[1]))
 (a.out/'pioneer-build.json').write_text(json.dumps(result,indent=2))
 assert all(result['survey']) and result['legacyFrame'] and result['step']==6,result
 print(json.dumps(result));b.close()
