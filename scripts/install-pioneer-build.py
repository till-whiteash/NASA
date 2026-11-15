from pathlib import Path
import shutil
root=Path('C:/NASA/Zhetalis-Nasa-tutorial');stage=Path(__file__).parent
def edit(file,old,new):
 p=root/file;s=p.read_text(encoding='utf-8');assert old in s,(file,old[:100]);p.write_text(s.replace(old,new,1),encoding='utf-8')
shutil.copyfile(stage/'pioneer-state.js',root/'game/src/pioneer-state.js')
edit('game/src/habitat-build-state.js','export const HAB_DONE',"import {newPioneer,pioneerObjective,pioneerLog,stockText} from './pioneer-state.js';\n\nexport const HAB_DONE")
edit('game/src/habitat-build-state.js','frames: [], pressure: 0 });','frames: [], pressure: 0, pioneer: newPioneer() });')
edit('game/src/habitat-build-state.js','  const b = o.habBuild, base', '  const prep=pioneerObjective(o.habBuild);if(prep)return prep;\n  const b = o.habBuild, base')
edit('game/src/habitat-build-state.js',"`${b.frames.length}/${modules} modules framed`", "`${b.frames.length}/${modules} modules framed · ${stockText(b)}`")
edit('game/src/habitat-build-state.js','Footings spread the weight on soft soil, then the frame goes up. Build them in any order.','Each frame uses 2 recovered alloy units and 1 membrane pack. Footings spread the weight; the frame supports the shell. Choose the module order yourself. The engineered footprints keep doors and pressure tunnels aligned.')
edit('game/src/habitat-build-state.js',"  return ['Walk to the habitat site'", "  return [...pioneerLog(o.habBuild), ...['Walk to the habitat site'")
edit('game/src/habitat-build-state.js','    .map((title, i) => ({ title, done: s > i }));','    .map((title, i) => ({ title, done: s > i }))];')
edit('game/src/sim.js','export const DIFFICULTY',"import {newHabBuild} from './habitat-build-state.js';\n\nexport const DIFFICULTY")
edit('game/src/sim.js','this.habBuild = { step: 0, cleared: [], rockHits: {}, frames: [], pressure: 0 };','this.habBuild = newHabBuild();')
edit('game/src/habitat-build.js',"import { heightAt }", "import {collectSalvage,recordSurvey,pioneerReady,spendFor,stockText,SURVEY_SECONDS} from './pioneer-state.js';\nimport { heightAt }")
# Props are placed outside the future module footprints, not on top of the mining stones.
edit('game/src/habitat-build.js','    if (this.b) this.b.modules', '''    const label=(text)=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#142630';ctx.fillRect(0,0,512,96);ctx.fillStyle='#ecfaf7';ctx.font='bold 30px system-ui';ctx.textAlign='center';ctx.fillText(text,256,58);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.34),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));sign.position.set(0,1.15,.42);return sign;};
    this.cargo=Array.from({length:6},(_,i)=>{
      const g=new THREE.Group(),x=c.x+(i%3-1)*3.2,z=this.front+8+Math.floor(i/3)*3.2;
      const box=new THREE.Mesh(new THREE.BoxGeometry(1.4,.8,.85),new THREE.MeshStandardMaterial({color:'#d18a40',roughness:.68,metalness:.2}));box.position.y=.4;g.add(box);
      for(const x of [-.45,.45]){const strap=new THREE.Mesh(new THREE.BoxGeometry(.07,.83,.89),steel);strap.position.set(x,.42,0);g.add(strap);}
      g.add(label('CARGO '+String(i+1).padStart(2,'0')));g.position.set(x,heightAt(x,z),z);g.userData={kind:'hab-cargo',id:i,label:'Recover cargo '+(i+1)+' · alloy, membrane and seals'};
      world.clearRocksAround?.(x,z,1.2);this.group.add(g);return g;
    });
    const readings=['Footing levels','Module alignment','Airlock clearance'];
    this.surveys=readings.map((text,i)=>{
      const g=new THREE.Group(),x=c.x+(i-1)*7,z=this.front+3;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,1.35,8),steel);pole.position.y=.675;g.add(pole);
      const instrument=new THREE.Mesh(new THREE.BoxGeometry(.52,.3,.3),new THREE.MeshStandardMaterial({color:'#58a8d2',emissive:'#102f4a'}));instrument.position.y=1.4;g.add(instrument);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.035,6,36),ghost('#76e5ff',.7));ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);
      g.add(label(text));g.position.set(x,heightAt(x,z),z);g.userData={kind:'hab-survey',id:i,label:'Calibrate · '+text};world.clearRocksAround?.(x,z,1);this.group.add(g);return g;
    });
    if (this.b) this.b.modules''')
edit('game/src/habitat-build.js','    this.group.visible = !built;', '''    this.group.visible = !built;
    this.cargo.forEach((g,i)=>g.visible=s===0&&!!b?.pioneer?.exitedPod&&!b.pioneer.collected.includes(i));
    this.surveys.forEach((g,i)=>g.visible=s===0&&b?.pioneer?.collected.length===6&&!b.pioneer.surveyed.includes(i));''')
edit('game/src/habitat-build.js','[...this.rocks, ...this.pads, this.post','[...this.cargo,...this.surveys,...this.rocks, ...this.pads, this.post')
edit('game/src/habitat-build.js','    if (b.step === 0) return', '''    if(b.step===0&&b.pioneer&&!pioneerReady(b))return nearest(b.pioneer.collected.length<6?this.cargo:this.surveys);
    if (b.step === 0) return''')
edit('game/src/habitat-build.js',"    if (d.kind === 'hab-rock') {", '''    if(!mesh.visible)return true;
    if(d.kind==='hab-cargo'){
      if(collectSalvage(b,d.id)){this.apply();this.guide('Cargo secured. '+stockText(b)+(b.pioneer.collected.length===6?' All cargo found. Use the three blue survey instruments next.':' Follow the marker to the next orange bundle.'),true);}return true;
    }
    if(d.kind==='hab-survey'){
      if(!b.pioneer?.calibrator)return true;
      if(!this.measuring){this.measuring={mesh,t:0};this.guide('Calibrator running: '+d.label+'. Stay within 3 metres for 3 seconds.');}return true;
    }
    if (d.kind === 'hab-rock') {''')
edit('game/src/habitat-build.js','      b.frames.push(d.id);', "      const cost=spendFor(b,'frame',d.id);if(!cost.ok){this.guide(cost.why);return true;}\n      b.frames.push(d.id);")
edit('game/src/habitat-build.js',"if (d.kind === 'hab-shell') { this.unfold();", "if (d.kind === 'hab-shell') { if(b.step!==3)return true;const cost=spendFor(b,'shell');if(!cost.ok){this.guide(cost.why);return true;}this.unfold();")
edit('game/src/habitat-build.js',"if (d.kind === 'hab-airlock') { this.advance", "if (d.kind === 'hab-airlock') { if(b.step!==4)return true;const cost=spendFor(b,'airlock');if(!cost.ok){this.guide(cost.why);return true;}this.advance")
edit('game/src/habitat-build.js','    if (b.step === 0 && Math.hypot', '''    if(this.measuring){
      const q=this.measuring;
      if(q.mesh.position.distanceTo(p)>3){this.measuring=null;this.guide('Measurement cancelled. Stand within 3 metres of the instrument and try again.');}
      else {q.t+=dt;q.mesh.rotation.y=Math.sin(q.t*5)*.12;
        this.notify('Calibrating '+Math.min(100,Math.round(q.t/SURVEY_SECONDS*100))+'% · stay close');
        if(q.t>=SURVEY_SECONDS){recordSurvey(b,q.mesh.userData.id);q.mesh.rotation.y=0;this.measuring=null;this.apply();this.guide(b.pioneer.surveyed.length===3?'Survey complete. Clear the four site rocks, then build each module from recovered cargo.':'Survey recorded. Go to the next blue instrument.',true);}
      }
    }
    if (b.step === 0 && pioneerReady(b) && Math.hypot''')
# Start new missions in the lander, wearing the checked suit. Resume keeps saved room/position.
edit('game/src/main.js','  placeLander(world);\n  // The player', '  placeLander(world);\n  if(outpost.habBuild?.pioneer){world.firstPerson=true;goInShip();}\n  // The player')
edit('game/src/main.js','<p><b>First job: build your habitat.</b>', '<p><b>Start in your pod, then build your habitat.</b> Your suit is on and checked. Use the hatch and complete its pressure cycle. Outside, recover six orange cargo bundles and calibrate the three blue survey instruments before building. </p><p><b>Your own construction choices.</b>')
edit('game/src/main.js',"  if (room === capsule) {   // down the stairs", "  if (room === capsule) {\n    const pioneer=outpost.habBuild?.pioneer;if(pioneer&&!pioneer.exitedPod){pioneer.exitedPod=true;world.habBuild?.apply();saveGame();}\n    // down the stairs")
print('Installed saved salvage, calibrator, resource costs and pod-first arrival.')
