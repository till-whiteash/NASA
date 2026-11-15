from pathlib import Path
root=Path(r'C:\NASA\Zhetalis-Nasa-tutorial')
def edit(file,old,new):
 p=root/file;s=p.read_text(encoding='utf-8')
 if old not in s:raise SystemExit('Missing anchor '+file+' '+old[:70])
 p.write_text(s.replace(old,new,1),encoding='utf-8')
edit('game/src/main.js','function mine(dep) {', '''// The aiming ray, not the nearest item label, decides which mineral receives a click.
function aimedMineral() {
  if(!world||!colony||inside||world.driving)return null;
  const ray=new THREE.Raycaster();ray.setFromCamera(world.aimPoint||{x:0,y:0},world.camera);
  const eye=world.player.position.clone().add(new THREE.Vector3(0,1,0));let best=null;
  for(const dep of colony.deposits){
    if(colony.s.mined.includes(dep.id)||!dep.group.parent||!dep.group.visible||Math.hypot(dep.x-eye.x,dep.z-eye.z)>5.5)continue;
    dep.group.updateWorldMatrix(true,true);
    const hit=ray.intersectObject(dep.group,true).find(h=>h.object.isMesh&&h.object.visible&&h.point.distanceTo(eye)<=3.3);
    if(hit&&(!best||hit.distance<best.hit.distance))best={dep,hit};
  }
  if(best&&construction?.hit&&construction.hit.distance<best.hit.distance-.03)return null;
  return best?.dep||null;
}
function inspectMineral(dep){
  if(!dep||colony.s.mined.includes(dep.id))return;
  const ore=ORES[dep.ore],left=Math.max(0,ore.hits-(colony.s.hits[dep.id]||0));
  modal({title:ore.name+' · rock inspection',html:`<div class="rock-inspection">${itemIcon(dep.ore)}<p>${ore.desc}</p><p><b>${keyWord('Left click','Tap Mine')}</b> with the pickaxe to mine. <b>E / Inspect</b> only examines the rock.</p><p>${left} strike${left===1?'':'s'} remaining · yields ${ore.yield} sample${ore.yield===1?'':'s'}.</p></div>`,choices:[{label:'Back to the rock',primary:true}]});
}
function primaryAction(){
  if(state.phase!=='mars'||isModalOpen()||world?.cinematic||world?.driving)return;
  construction?.update(inside,room,false);
  const mineral=aimedMineral();if(mineral){mine(mineral);return;}
  if(construction?.mine?.())return;
  if(colony?.tool==='builder'){openBuild();return;}
  if(!inside&&colony?.tool==='pickaxe')world.swingTool(()=>{});
}
function mine(dep) {''')
edit('game/src/main.js',"  world.swingTool(() => {\n    footstep(1);","  world.swingTool(() => {\n    if(colony.tool!=='pickaxe'||colony.s.mined.includes(dep.id)||!dep.group.parent||Math.hypot(dep.x-world.player.position.x,dep.z-world.player.position.z)>5.5)return;\n    footstep(1);")
edit('game/src/main.js',"if (n.type === 'ore') { mine(n.deposit); return; }","if (n.type === 'ore') { inspectMineral(n.deposit); return; }")
edit('game/src/main.js',"  if (code === 'KeyI') { openBackpack(); return; }","  if (code === 'PrimaryAction') { primaryAction(); return; }\n  if (code === 'KeyI') { openBackpack(); return; }")
edit('game/src/main.js',"  if (code === 'KeyE') {\n    if(construction?.use()) return;","  if (code === 'KeyE') {\n    construction?.update(inside,room,false);\n    const mineral=aimedMineral();if(mineral){inspectMineral(mineral);return;}\n    if(construction?.use()) return;")
p=root/'game/src/main.js';s=p.read_text(encoding='utf-8');a=s.index("$('#view').addEventListener('click', () => {");b=s.index('// Free the mouse',a)
s=s[:a]+'''$('#view').addEventListener('click', e => {
  if(lastPointer==='touch'||e.button!==0)return;
  primaryAction();captureMouse();
});
'''+s[b:];p.write_text(s,encoding='utf-8')
edit('game/src/main.js',"hint = `${useWord} to mine ${ORES[near.deposit.ore].name.toLowerCase()}","hint = `${keyWord('Left click','Tap Mine')} to mine · E / Inspect · ${ORES[near.deposit.ore].name.toLowerCase()}")
edit('game/src/main.js',"  if (sleepBunk) { useLabel = 'Get up'; hint = ''; }","  if(near?.type==='ore'||construction?.hit?.object===world.rocks||['rubble','hab-rock'].includes(construction?.hit?.object?.userData.kind))useLabel='Inspect';\n  if (sleepBunk) { useLabel = 'Get up'; hint = ''; }")
edit('game/src/main.js',"inside, canEat: !!body.canEat, useLabel });","inside, canEat: !!body.canEat, canMine:!inside&&!world.driving&&colony.tool==='pickaxe', useLabel });")
edit('game/src/touch.js','      <button id="t-jump">','      <button id="t-mine" class="hidden" aria-label="Mine rock"><span>Mine</span></button>\n      <button id="t-jump">')
edit('game/src/touch.js',"  btn('#t-use', () => press('KeyE'));","  btn('#t-use', () => press('KeyE'));\n  btn('#t-mine', () => press('PrimaryAction'));")
edit('game/src/touch.js','sync({ active, canUse, inside, canEat, useLabel })','sync({ active, canUse, inside, canEat, canMine, useLabel })')
edit('game/src/touch.js',"      root.querySelector('#t-view').classList.toggle('hidden', !!inside);","      root.querySelector('#t-mine').classList.toggle('hidden', !canMine);\n      root.querySelector('#t-power').classList.toggle('hidden', !!canMine);\n      root.querySelector('#t-view').classList.toggle('hidden', !!inside);")
p=root/'game/src/player-tutorial.js';s=p.read_text(encoding='utf-8');s=s.replace('Aim at a mineral deposit, then press E / Action repeatedly.','Aim at a mineral deposit, then left click / tap Mine repeatedly. E / Inspect only examines the rock.').replace('aim at the rock and use it repeatedly.','aim at the rock and left click / tap Mine repeatedly. E / Inspect examines it without mining.').replace('Break all four marked site rocks with the pickaxe.','Left click / tap Mine to break all four marked site rocks with the pickaxe.').replace('At the remote field, clear the four marked rocks with the pickaxe.','At the remote field, left click / tap Mine to clear the four marked rocks with the pickaxe.');p.write_text(s,encoding='utf-8')
p=root/'game/index.html';s=p.read_text(encoding='utf-8');s=s.replace('./src/colony.js?v=coop-3','./src/colony.js?v=inventory-1').replace('./src/player-tutorial.js?v=coop-3','./src/player-tutorial.js?v=inventory-mine-1').replace('./src/touch.js?v=coop-3','./src/touch.js?v=mine-1').replace('src/main.js?v=films-autoplay-1','src/main.js?v=inventory-mine-1');p.write_text(s,encoding='utf-8')
print('Left click mining, E inspection, and dedicated touch Mine hooks installed.')
