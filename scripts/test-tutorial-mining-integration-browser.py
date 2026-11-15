"""Guard tutorial mining against habitat/layout changes and stale scenery picks.

Exercises the normal Construction ray/Use path, not HabitatBuild.use directly.
Requires the committed tutorial build; screenshots and JSON go to --out.
"""
from pathlib import Path
import argparse, base64, json, sys

parser=argparse.ArgumentParser()
parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(args.root/'game/animation/trailer/scripts'))
from game_session import open_game, sync_playwright

SCRIPT="""async () => {
 const THREE=await import('three'),{ORES}=await import('./src/colony.js');
 const w=game.world,o=game.outpost,c=game.construction,hb=w.habBuild,col=game.colony;
 game.renderer.setAnimationLoop(null);col.s.held=col.s.belt.indexOf('pickaxe');col.equip();
 const result={habitat:[],power:[],ore:null,errors:[]};
 const photoRenderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});photoRenderer.setSize(1100,650);
 photoRenderer.toneMapping=game.renderer.toneMapping;photoRenderer.outputColorSpace=game.renderer.outputColorSpace;
 function photo(point){const cam=new THREE.PerspectiveCamera(50,1100/650,.05,1800);
   cam.position.set(point.x-5,point.y+4,point.z+7);cam.lookAt(point.x+2,point.y,point.z);
   photoRenderer.render(w.scene,cam);return photoRenderer.domElement.toDataURL('image/png');}
 function drain(){for(let n=0;n<90&&w.toolSwing>=0;n++)w.updateSwing(1/60);}
 function aim(rock,angle=0){
   const p=rock.position;w.player.position.set(p.x+Math.sin(angle)*1.9,p.y-.22,p.z+Math.cos(angle)*1.9);
   w.camera.position.copy(w.player.position).add(new THREE.Vector3(0,1.3,0));
   w.camera.lookAt(p);w.camera.updateMatrixWorld(true);w.aimPoint={x:0,y:0};
   c.update(false,null,false);return c.hit;
 }
 function hitRock(rock){
   const hit=aim(rock);
   if(hit?.object!==rock)return {ok:false,kind:hit?.object?.userData?.kind||'scenery',instance:hit?.instanceId};
   const used=c.use();drain();return {ok:used,kind:hit.object.userData.kind};
 }
 o.habBuild.step=1;hb.apply();
 result.habitatPhoto=photo(hb.rocks[0].position);
 for(const rock of hb.rocks){
   const strikes=[];for(let n=0;n<3;n++)strikes.push(hitRock(rock));
   result.habitat.push({id:rock.userData.id,strikes,hits:o.habBuild.rockHits[rock.userData.id]||0,cleared:o.habBuild.cleared.includes(rock.userData.id)});
 }
 result.habitatNext=game.mission.objective().id;
 // Ordinary rubble hidden by a layout update must never retain a ray proxy.
 const sample=c.rockSamples.find(s=>s.position.y>-1000&&s.radius<3);
 if(sample){
   w.clearRocksAround(sample.position.x,sample.position.z,.2);
   const proxy={position:sample.position};aim(proxy);
   result.hiddenScenery={id:sample.id,pickedHidden:c.hit?.object===w.rocks&&c.hit.instanceId===sample.id};
 }
 // Both tutorial sites share the pickaxe; finishing the habitat cannot disable
 // the four power-field stones or silently advance past their clearance task.
 o.habBuild.step=6;hb.apply();o.powerStep=2;
 c.update(false,null,false);result.powerPhoto=photo(c.rubble[0].position);
 for(const rock of c.rubble){
   const strikes=[];for(let n=0;n<3;n++)strikes.push(hitRock(rock));
   result.power.push({id:rock.userData.id,strikes,hits:o.construction.rockHits['site-'+rock.userData.id]||0,cleared:o.construction.cleared.includes(rock.userData.id)});
 }
 result.powerStep=o.powerStep;
 // A mineral deposit must still give samples; scenery clearing is separate.
 const dep=col.deposits.find(d=>d.group.parent&&!col.s.mined.includes(d.id));
 if(dep){
   const before=col.s.bag[dep.ore];let strike;
   for(let n=0;n<ORES[dep.ore].hits;n++){w.swingTool(()=>{strike=col.strike(dep);});drain();}
   result.ore={name:dep.ore,gained:col.s.bag[dep.ore]-before,mined:col.s.mined.includes(dep.id),broke:!!strike?.broke};
 }
 const saved=JSON.parse(JSON.stringify(o));
 result.saved={habitat:saved.habBuild.cleared.length,power:saved.construction.cleared.length};
 // Photograph the cleared field and retained cable hardware using the real scene.
 result.fieldPhoto=photo(w.settlement.pack.position);photoRenderer.dispose();
 return result;
}"""
with sync_playwright() as p:
    browser,page=open_game(p,w=1280,h=720)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        result=page.evaluate(SCRIPT)
        for key in [k for k in result if k.endswith('Photo')]:
            (args.out/(key+'.png')).write_bytes(base64.b64decode(result.pop(key).split(',')[1]))
        result['runtime_errors']=errors
        (args.out/'mining-integration.json').write_text(json.dumps(result,indent=2))
        print(json.dumps(result),flush=True)
        assert all(x['cleared'] and x['hits']==3 and all(s['ok'] for s in x['strikes']) for x in result['habitat']),result['habitat']
        assert result['habitatNext']=='hab-2',result['habitatNext']
        assert not result.get('hiddenScenery',{}).get('pickedHidden'),result.get('hiddenScenery')
        assert all(x['cleared'] and x['hits']==3 and all(s['ok'] for s in x['strikes']) for x in result['power']),result['power']
        assert result['powerStep']==2,'Clearing must not skip placing the panels'
        assert result['ore']['gained']>0 and result['ore']['mined'],result['ore']
        assert result['saved']=={'habitat':4,'power':4},result['saved']
        assert not errors,errors
        print('Ray-targeted habitat stones, power-field stones, hidden scenery, ore yields and saved progress passed.')
    finally:browser.close()
