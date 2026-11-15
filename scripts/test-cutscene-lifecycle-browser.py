"""Storm and landing replay: bounded draw calls, stable GPU resources, restored gameplay."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import re, json
ROOT=Path(__file__).resolve().parents[1]
from browser_test_server import start_server
server=start_server()
imports=re.search(r'<script type="importmap">(.*?)</script>',(ROOT/'game/index.html').read_text(encoding='utf-8'),re.S).group(1)
fixture='<base href="/game/"><script type="importmap">'+imports+'</script><link rel="stylesheet" href="style.css">'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(channel='msedge',headless=True)
  pg=b.new_page();errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.route('**/audit.html*',lambda r:r.fulfill(body=fixture,content_type='text/html'))
  pg.goto(f'http://127.0.0.1:{server.server_port}/audit.html?graphics=low')
  result=pg.evaluate('''async()=>{
  const THREE=await import('three'),{playLanding,playStorm}=await import('./src/cutscenes.js');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,16/9,.1,2000);scene.fog=new THREE.Fog('#bc9870',20,500);
  const sky=new THREE.Group(),terrain=new THREE.Group(),player=new THREE.Group();scene.add(sky,terrain,player,new THREE.HemisphereLight());
  const renderer=new THREE.WebGLRenderer();renderer.setSize(640,360);let physics=0;
  const w={scene,camera,sky,terrain,player,renderer,viewSlot:new THREE.Group(),pickups:[],keys:{},colliders:[],time:0,update:()=>{physics++},placeSky:()=>{}};
  const output={};
  for(const [name,play,stages] of [['storm',playStorm,[0,4.4,9,13.9]],['landing',playLanding,[0,6,10,14,17.3,19,21]]]){
    const memory=[],samples=[];
    for(let n=0;n<3;n++){const f=play(w,{manual:true});for(const t of stages){f.setTime(t);w.cutsceneFrame(1/60,false);renderer.render(scene,camera);if(n===0)samples.push({t,calls:renderer.info.render.calls});}
      f.dispose();renderer.render(scene,camera);memory.push({...renderer.info.memory});}
    output[name]={memory,samples};
  }
  output.physics=physics;output.clean=!w.cutsceneFrame&&!w.cinematic;renderer.dispose();renderer.forceContextLoss();return output;
  }''')
  print(json.dumps(result));assert result['physics']==0 and result['clean']
  for name in ['storm','landing']:
   values=result[name]['memory'];assert values[0]==values[-1],values
  assert max(s['calls'] for s in result['storm']['samples'])<=97
  assert not errors,errors
  b.close()
finally:server.shutdown()
