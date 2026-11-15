// Deliberately separate from main.js: use the same World class, then swap only
// the habitat visuals. No saved mission or production model file is changed.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { World, heightAt } from '../src/world.js';
import { createOpenLayout } from './open-world-layout.js';

const $ = s => document.querySelector(s);
const canvas = $('#lab-view'), viewport = canvas.parentElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const gltfLoader = new GLTFLoader(), variants = {}, loading = {};
let active = 'current', walk = false, footprint = 34, measurement = null, meteorite, openLayout;
const facts = (await (await fetch('data/mars-facts.json')).json()).facts;
const assetStats = await (await fetch('internal/unity-model-lab/asset-stats.json')).json();

class LabWorld extends World {
  swapModel(file, target, height, onlyChildren) {
    if (file !== 'hab.glb') return super.swapModel(file, target, height, onlyChildren);
    this.labHabTarget = target;
    this.labHabParts = onlyChildren.map(i => target.children[i]).filter(Boolean);
    this.labHabReady = gltfLoader.loadAsync('assets/hab.glb').then(gltf => {
      const model = gltf.scene;
      const ref = new THREE.Box3(); this.labHabParts.forEach(o => ref.expandByObject(o));
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      model.scale.setScalar(ref.getSize(new THREE.Vector3()).y / size.y);
      model.position.y -= new THREE.Box3().setFromObject(model).min.y;
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.labHabParts.forEach(o => o.visible = false); target.add(model);
      variants.current = model;
    });
  }
}
const world = new LabWorld(renderer, facts, () => {});
const originalTerrainGeometry=world.terrain.geometry,originalTerrainMaterial=world.terrain.material;
const subduedTerrainGeometry=originalTerrainGeometry.clone(),subduedTerrainMaterial=originalTerrainMaterial.clone();
const terrainColours=subduedTerrainGeometry.getAttribute('color'),shade=new THREE.Color();
for(let i=0;i<terrainColours.count;i++){shade.fromBufferAttribute(terrainColours,i).offsetHSL(0,-.2,-.015);terrainColours.setXYZ(i,shade.r,shade.g,shade.b);}
const originalHemi={sky:world.hemi.color.clone(),ground:world.hemi.groundColor.clone()};
const baseColliders = [...world.colliders], baseDoor = world.door.clone();
const baseShipDoor = world.shipDoor?.clone();
const originalProps = world.outpost.group.children.slice(5).map(object => [object,object.visible]);
world.setPanels(6); world.setTime(.3);
const camera = new THREE.PerspectiveCamera(48, 1, .1, 1800);
camera.position.set(32, 24, 36);
const orbit = new OrbitControls(camera, canvas); orbit.target.set(0, 3, 0); orbit.enableDamping = false;
orbit.minDistance = 8; orbit.maxDistance = 100; orbit.maxPolarAngle = Math.PI * .48; orbit.update();
const collisionOverlay = new THREE.Group(); world.scene.add(collisionOverlay);
for (const collider of world.outpost.colliders) {
  const points = Array.from({length:65}, (_,i) => new THREE.Vector3(collider.x + Math.cos(i / 64 * Math.PI * 2) * collider.r, .12, collider.z + Math.sin(i / 64 * Math.PI * 2) * collider.r));
  collisionOverlay.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({color:'#8dffc2',depthTest:false,transparent:true,opacity:.8})));
}
const doorMarker = new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,4,12), new THREE.MeshBasicMaterial({color:'#8dffc2',wireframe:true}));
doorMarker.position.set(world.door.x, 2, world.door.z); collisionOverlay.add(doorMarker);
await world.labHabReady;
let phase = .3;
const controls = [...document.querySelectorAll('[data-variant]')];
function dimensions(object) { return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()); }
function scaleCandidate(object) {
  object.scale.setScalar(1); object.position.set(0,0,0); object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object), size = bounds.getSize(new THREE.Vector3());
  object.scale.setScalar(footprint / Math.max(size.x,size.z));
  const fitted = new THREE.Box3().setFromObject(object), centre = fitted.getCenter(new THREE.Vector3());
  object.position.set(-centre.x,-fitted.min.y,-centre.z); object.updateMatrixWorld(true);
}
async function select(name) {
  if (name === 'open' && !variants.open) {
    await select('tuned');
    variants.open = variants.tuned.clone(true); world.scene.add(variants.open);
    openLayout = await createOpenLayout(world, variants.open);
  }
  if (!variants[name] && name !== 'current' && name !== 'open') {
    $('#lab-ready').textContent = `Loading ${name === 'original' ? 'original Unity textures' : 'tuned Unity base'}…`;
    loading[name] ??= gltfLoader.loadAsync(`internal/unity-model-lab/${name === 'original' ? 'source' : 'tuned'}/scene.gltf`).then(gltf => {
      const model = gltf.scene; scaleCandidate(model);
      model.traverse(o => { if(o.isMesh) {o.castShadow=true;o.receiveShadow=true;} });
      model.visible = false; world.scene.add(model); variants[name] = model;
    });
    await loading[name];
  }
  active = name;
  Object.entries(variants).forEach(([key, model]) => model.visible = key === name);
  openLayout?.setVisible(name === 'open');
  world.colliders = name === 'open' ? openLayout.colliders : baseColliders;
  world.door.copy(name === 'open' ? openLayout.door : baseDoor);
  world.extraTargets = name === 'open' ? openLayout.targets : undefined;
  world.shipDoor = name === 'open' ? null : baseShipDoor;
  world.terrain.geometry=name==='open'?subduedTerrainGeometry:originalTerrainGeometry;
  world.terrain.material=name==='open'?subduedTerrainMaterial:originalTerrainMaterial;
  world.hemi.color.copy(name==='open'?new THREE.Color('#e6ded0'):originalHemi.sky);
  world.hemi.groundColor.copy(name==='open'?new THREE.Color('#685e54'):originalHemi.ground);
  originalProps.forEach(([object,visible]) => object.visible = name === 'open' ? false : visible);
  world.pickups.forEach(p => p.group.visible = name !== 'open');
  if (name === 'open') { variants.current.visible = false; variants.tuned.visible = false; }
  $('#travel').hidden = name !== 'open';
  rebuildCollisions();
  controls.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.variant === name)));
  $('#lab-ready').textContent = name === 'current' ? 'Current habitat · existing gameplay' : name === 'open' ? 'Open exploration · crew-scale modules and refitted collisions' : `Unity ${name} · visual replacement only`;
  updateMetrics(); return summary();
}
function rebuildCollisions() {
  for(const object of [...collisionOverlay.children]) if(object!==doorMarker){object.geometry.dispose();object.material.dispose();collisionOverlay.remove(object);}
  const colliders = active === 'open' ? openLayout.moduleColliders : world.outpost.colliders;
  for(const c of colliders){const points=Array.from({length:65},(_,i)=>new THREE.Vector3(c.x+Math.cos(i/64*Math.PI*2)*c.r,.12,c.z+Math.sin(i/64*Math.PI*2)*c.r));collisionOverlay.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#8dffc2',depthTest:false,transparent:true,opacity:.8})));}
  doorMarker.position.set(world.door.x,2,world.door.z);
}
function summary() {
  const model = variants[active], size = dimensions(model);
  let triangles = 0, meshes = 0; const maps = new Set();
  model.traverse(o => { if (!o.isMesh) return; meshes++; triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
    for (const m of [].concat(o.material)) if (m.map) maps.add(m.map);
  });
  const pixels = [...maps].reduce((n,t)=>n+(t.image?.width||0)*(t.image?.height||0),0);
  return {variant:active,meshes,triangles,dimensions:{x:size.x,y:size.y,z:size.z},textures:maps.size,textureMemoryEstimateBytes:Math.round(pixels*4*4/3),drawCalls:renderer.info.render.calls,sceneTriangles:renderer.info.render.triangles};
}
const mb = n => (n / 1024 / 1024).toFixed(1) + ' MB';
function updateMetrics(extra={}) {
  const s = {...summary(),...extra};
  const rows = [['Variant',s.variant],['Habitat triangles',s.triangles.toLocaleString()],['Habitat meshes',s.meshes],['Height',s.dimensions.y.toFixed(1)+' m'],['Width × depth',s.dimensions.x.toFixed(1)+' × '+s.dimensions.z.toFixed(1)+' m'],['Texture memory estimate',mb(s.textureMemoryEstimateBytes)],['Scene draw calls',s.drawCalls],['Scene triangles',s.sceneTriangles.toLocaleString()]];
  if(s.medianFrameMs) rows.push(['Median frame interval',s.medianFrameMs.toFixed(1)+' ms'],['Median render CPU time',s.medianRenderMs.toFixed(2)+' ms']);
  $('#metrics').replaceChildren(...rows.flatMap(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;return[dt,dd];}));
}
function routeTest() {
  const waypoints=active==='open'?openLayout.route:[[-18,-12],[-18,12],[0,12],[0,8.5]], points=[];
  world.player.position.set(-1.5,heightAt(-1.5,-11),-11); world.move.set(0,0,0); world.vel.set(0,0,0);world.keys={};
  let steps=0, reached=0, visualCrossings=0;
  const ray = new THREE.Raycaster();
  for(const [x,z] of waypoints) {
    for(let frame=0;frame<1800;frame++) {
      const p=world.player.position,dx=x-p.x,dz=z-p.z;
      if(Math.hypot(dx,dz)<.5){reached++;break;}
      const before=p.clone(); world.yaw=Math.atan2(dx,dz);world.keys.KeyW=true;world.update(1/60,true);steps++;
      const distance=before.distanceTo(p);
      if(active!=='current'&&distance>0) {
        ray.set(before.clone().add(new THREE.Vector3(0,1.2,0)),p.clone().sub(before).normalize());ray.near=0;ray.far=distance;
        if(ray.intersectObject(variants[active],true).length)visualCrossings++;
      }
      if(frame%30===0)points.push(p.clone());
    }
  }
  world.keys={};world.move.set(0,0,0);
  const near=world.nearest();
  const result={variant:active,waypointsReached:reached,waypoints:waypoints.length,simulatedWalkSeconds:steps/60,doorReachable:near?.type==='door',visualWallCrossingSamples:visualCrossings,position:world.player.position.toArray()};
  $('#route-result').textContent=`${reached}/4 route points reached. Door ${result.doorReachable?'reachable':'not reached'}. ${visualCrossings} visual wall crossings detected along the route. Existing colliders unchanged.`;
  return result;
}
async function measure(frames=90) {
  if(measurement)throw new Error('Measurement already running');
  return new Promise(resolve=>measurement={frames,intervals:[],renders:[],resolve});
}
controls.forEach(b=>b.onclick=async()=>{controls.forEach(c=>c.disabled=true);try{await select(b.dataset.variant);}catch(error){$('#lab-ready').textContent='Model load failed. The current habitat remains available.';console.error(error);}finally{controls.forEach(c=>c.disabled=false);}});
$('#footprint').oninput=e=>{footprint=Number(e.target.value);$('#footprint-value').textContent=footprint+' m';for(const [name,model]of Object.entries(variants))if(name!=='current')scaleCandidate(model);if(openLayout){openLayout.refit();if(active==='open'){world.colliders=openLayout.colliders;world.door.copy(openLayout.door);rebuildCollisions();}}updateMetrics();};
$('#day').onclick=()=>{phase=.3;world.setTime(phase);};$('#night').onclick=()=>{phase=.86;world.setTime(phase);};
$('#colliders').onchange=e=>collisionOverlay.visible=e.target.checked;
$('#reset-view').onclick=()=>{walk=false;orbit.enabled=true;camera.position.set(32,24,36);orbit.target.set(0,3,0);orbit.update();};
$('#walk-view').onclick=()=>{walk=true;orbit.enabled=false;const p=active==='open'?openLayout.spawn:[0,13];world.player.position.set(p[0],heightAt(...p),p[1]);world.yaw=Math.PI;};
document.querySelectorAll('[data-travel]').forEach(button=>button.onclick=()=>{if(!openLayout)return;const [x,z]=openLayout.locations[button.dataset.travel];walk=true;orbit.enabled=false;world.player.position.set(x,heightAt(x,z+3),z+3);world.move.set(0,0,0);world.vel.set(0,0,0);world.yaw=Math.PI;canvas.focus();$('#view-hint').textContent=openLayout.names[button.dataset.travel]+' · WASD to explore, E to inspect nearby sites.';});
$('#meteorite').onchange=async e=>{
  if(e.target.checked&&!meteorite){const geo=await new STLLoader().loadAsync('internal/unity-model-lab/block-island.stl');geo.computeVertexNormals();meteorite=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#8c7770',roughness:.9}));meteorite.rotation.x=-Math.PI/2;const box=new THREE.Box3().setFromObject(meteorite),size=box.getSize(new THREE.Vector3());meteorite.scale.setScalar(2/Math.max(size.x,size.y,size.z));const fitted=new THREE.Box3().setFromObject(meteorite),mid=fitted.getCenter(new THREE.Vector3());meteorite.position.set(-11-mid.x,-fitted.min.y,10-mid.z);meteorite.castShadow=true;meteorite.receiveShadow=true;world.scene.add(meteorite);}
  if(meteorite)meteorite.visible=e.target.checked;
};
$('#route-test').onclick=()=>routeTest();$('#benchmark').onclick=async()=>{const b=$('#benchmark');b.disabled=true;b.textContent='Measuring…';try{updateMetrics(await measure());}finally{b.disabled=false;b.textContent='Measure 90 frames';}};
let drag=null;
canvas.addEventListener('pointerdown',e=>{if(!walk)return;canvas.focus();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;world.yaw-=(e.clientX-drag.x)*.004;world.pitch=THREE.MathUtils.clamp(world.pitch+(e.clientY-drag.y)*.004,-.1,1.2);Object.assign(drag,{x:e.clientX,y:e.clientY});});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||!walk)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();world.keys[e.code]=true;if(e.code==='KeyV'&&!e.repeat)world.firstPerson=!world.firstPerson;if(e.code==='KeyE'&&!e.repeat){const near=world.nearest();if(near?.type==='sev')world.enterRover();else if(near?.type==='sev-exit')world.exitRover();const notes={'survey-meteorite':'Meteorite field: real supplied Block Island geometry. Display size is approximate; this site location is fictional.','survey-relay':'Relay ridge: fictional instrument location. Mars missions use orbiters to relay data; this mast is a design concept.','survey-ice':'Subsurface survey: drill or sense beneath the dusty ground. This prototype does not claim exposed ice or a confirmed deposit at Gusev.','door':'Habitat airlock target reached. The production interior is not connected in this isolated study.'};$('#view-hint').textContent=notes[near?.type]||'Nearest interaction: '+(near?.type||'nothing nearby');}});
addEventListener('keyup',e=>world.keys[e.code]=false);addEventListener('blur',()=>world.keys={});
const resize=new ResizeObserver(()=>{const {width,height}=viewport.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=world.camera.aspect=width/height;camera.updateProjectionMatrix();world.camera.updateProjectionMatrix();});resize.observe(viewport);
let last=performance.now(),counter=0;
renderer.setAnimationLoop(()=>{
  const now=performance.now(),interval=now-last,dt=Math.min(interval/1000,.05);last=now;
  world.update(dt,walk); const start=performance.now();renderer.render(world.scene,walk?world.camera:camera);const renderMs=performance.now()-start;
  if(measurement&&interval<1000){measurement.intervals.push(interval);measurement.renders.push(renderMs);if(measurement.intervals.length>=measurement.frames){const m=measurement;measurement=null;const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];const result={...summary(),medianFrameMs:median(m.intervals),medianRenderMs:median(m.renders),frames:m.frames};m.resolve(result);}}
  if(++counter%60===0&&!measurement)updateMetrics();
});
$('#view-hint').textContent='Overview: drag to orbit, scroll to zoom. Use Walk mode to try the current movement and interactions.';
await select('current');
window.modelLab={select,summary,measure,routeTest,world,variants,assetStats,get openLayout(){return openLayout;},setNight:value=>{phase=value ? .86 : .3;world.setTime(phase);}};
if(new URLSearchParams(location.search).get('variant')==='open'){await select('open');collisionOverlay.visible=false;$('#colliders').checked=false;}
