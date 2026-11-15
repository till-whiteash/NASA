from pathlib import Path
import shutil
root=Path('C:/NASA/Zhetalis-Nasa-tutorial');stage=Path(__file__).parent
def edit(file,old,new):
 p=root/file;s=p.read_text(encoding='utf-8');assert old in s,(file,old[:100]);p.write_text(s.replace(old,new,1),encoding='utf-8')
for f in ['battery-bank-state.js','battery-bank.js']:shutil.copyfile(stage/f,root/'game/src'/f)
edit('game/src/sim.js',"import {newHabBuild}","import {queueBattery} from './battery-bank-state.js';\nimport {newHabBuild}")
edit('game/src/sim.js','this.upgrades.battery += 1; this.battery += TUNED.batteryUpgrade;', 'queueBattery(this);')
edit('game/src/sim.js', 'so the heater never runs out.', 'after you place, inspect and wire its parallel branch. It does not create energy.')
edit('game/src/power-tutorial-state.js',"import { ASSEMBLIES }", "import {wiredBatteries} from './battery-bank-state.js';\nimport { ASSEMBLIES }")
edit('game/src/power-tutorial-state.js','Math.min(1 + (o.upgrades?.battery || 0),', 'Math.min(1 + wiredBatteries(o),')
edit('game/src/power-tutorial-state.js','  const needBat =', "  if(wiredBatteries(o)<(o.upgrades?.battery||0))return 'Place, inspect and connect your extra battery at the field power site. An unwired pack cannot power another base.';\n  const needBat =")
edit('game/src/construction.js',"import * as THREE from 'three';", "import * as THREE from 'three';\nimport {BatteryBank} from './battery-bank.js';")
edit('game/src/construction.js',"  this.cables=new Map();", "  this.bank=new BatteryBank(world,{state,save,guide,cancel:()=>this.cancel(),cable:fieldCable});\n  this.cables=new Map();")
edit('game/src/construction.js',' cancel(){dispatchEvent', ' cancel(){this.bank?.cancel();dispatchEvent')
edit('game/src/construction.js','this.drop.hidden=!(this.held||this.wire)||blocked;', 'this.bank.update(inside,blocked);this.drop.hidden=!(this.held||this.wire||this.bank.held)||blocked;')
edit('game/src/construction.js','...(this.world.habBuild?.targets()||[])', '...this.bank.targets(),...(this.world.habBuild?.targets()||[])')
edit('game/src/construction.js',"  if(this.noticeUntil>performance.now())", "  if(this.bank.held)this.hint=this.bank.hint()+' · '+this.hint;\n  if(this.noticeUntil>performance.now())")
edit('game/src/construction.js',"  if(d.kind?.startsWith('hab-'))", "  if(d.kind?.startsWith('bank-'))return this.bank.use(mesh);\n  if(d.kind?.startsWith('hab-'))")
edit('game/src/construction.js',"  if(d.kind==='socket'){", "  if(d.kind==='socket'){this.bank.cancel();")
# Replace the soil-as-return explanation with a real continuous chassis bond.
p=root/'game/src/construction.js';s=p.read_text(encoding='utf-8');start=s.index('// The ground rod beside');end=s.index('// Workbench parts',start)
s=s[:start]+'''// Chassis bonding is a continuous metal fault-return path to the protected source.
// The local rod is a static reference only; Martian soil is never the fuse-clearing return.
function groundBond(pack,base){
 const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:'#d1cf45',roughness:.6});
 const a=pack.clone().add(new THREE.Vector3(.6,.05,.3)),b=base.clone();
 const pts=[a,new THREE.Vector3(a.x,heightAt(a.x,a.z)+.08,a.z),new THREE.Vector3(b.x,heightAt(b.x,b.z)+.08,b.z),b];
 g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),100,.018,8),mat));
 const bar=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.14),new THREE.MeshStandardMaterial({color:'#b69148',metalness:.8,roughness:.3}));bar.position.copy(a);g.add(bar);
 return g;
}
'''+s[end:]
s=s.replace('// once the solar side is wired, the cabinet is bonded to a ground rod (green-yellow lead): GND is tied to the soil','// Once the base is wired, bond its metal frame back to the protected cabinet bus.')
s=s.replace('if(leadsOn(o,0).length===2&&!this.groundRod){this.groundRod=groundBond(this.world.settlement.pack.position);','if(o.baseConnected&&!this.groundRod){const e=this.world.settlement.entrances[0];this.groundRod=groundBond(this.world.settlement.pack.position,new THREE.Vector3(e.x+2.3,.5,e.doorZ+1.14));')
p.write_text(s,encoding='utf-8')
edit('game/src/construction-state.js',"black GND − (ground return)","black GND − (DC return)")
edit('game/src/construction-state.js','// Red goes on first and black last (the safe order on a real battery), colours must match, and power flows only','// These training connectors are isolated before fitting leads. Colours must match, and power flows only')
edit('game/src/construction-state.js',"export const ORDER_LESSON=", "export const ORDER_LESSON=") if False else None
p=root/'game/src/construction-state.js';s=p.read_text(encoding='utf-8');start=s.index('export const ORDER_LESSON=');end=s.index('\n',start)
s=s[:start]+"export const ORDER_LESSON='This training branch is isolated while you fit its touch-safe connectors. Fit red + to +, then black − to −. Inspect the circuit before energizing. This game order is not a universal real-battery procedure. Black DC return and the separate green-yellow chassis bond have different jobs.';"+s[end:];p.write_text(s,encoding='utf-8')
edit('game/src/mars-objectives.js',"import {habBuildObjective", "import {bankObjective} from './battery-bank-state.js';\nimport {habBuildObjective")
edit('game/src/mars-objectives.js'," if(!(o.research?.relay>=3))", " const bank=bankObjective(o);if(bank)return bank;\n if(!(o.research?.relay>=3))")
edit('game/src/main.js',"primary.id.startsWith('safety-')", "primary.id.startsWith('hab-')||primary.id.startsWith('bank-')||primary.id.startsWith('safety-')")
edit('game/src/main.js',"  if(kind==='hab')return", "  if(kind==='bank')return construction?.bank.target()||null;\n  if(kind==='hab')return")
edit('game/src/main.js','    <p>Emergency reserve:', '''    <details><summary>How the base stays alive · learn more</summary><p><b>Follow the energy:</b> sunlight → solar cells → charge controller → battery → fused supply → life support, communications and science. Two matched 48 V batteries in parallel stay at 48 V and store more energy. A series link would change voltage and is not accepted by this base.</p><p><b>Night and dust:</b> storage moves energy from sunny times to dark times; it cannot make energy. Keep the heater and oxygen plant supplied before spending spare power on science. The forecast below shows the consequences before the next sol.</p><p><b>Two different returns:</b> black − carries normal load current back to the source. The green-yellow bond joins metal frames to the protection reference, providing a low-resistance fault path. Dirt alone is not a reliable return for opening a fuse.</p><p>Voltages, capacities, timing and daily demand are teaching examples. Real habitats need detailed structural, thermal, pressure and electrical engineering.</p></details>
    <p>Emergency reserve:''')
print('Installed physical parallel-pack commissioning, capacity gates and corrected bonding lessons.')
