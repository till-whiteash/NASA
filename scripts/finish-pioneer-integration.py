from pathlib import Path
root=Path('C:/NASA/Zhetalis-Nasa-tutorial')
def edit(f,old,new):
 p=root/f;s=p.read_text(encoding='utf-8');assert old in s,(f,old[:80]);p.write_text(s.replace(old,new,1),encoding='utf-8')
# A received co-op build update must refresh the physical site too.
edit('game/src/main.js',"  if (changed.has('o.upgrades'))", "  if (changed.has('o.habBuild')) world.habBuild?.apply(true);\n  if (changed.has('o.upgrades'))")
# Mount the service-bus connectors to a visible rail, rather than leaving floating terminals.
edit('game/src/battery-bank.js',"  const ports=[];", "  const rail=new THREE.Mesh(new THREE.BoxGeometry(.85,.1,.28),new THREE.MeshStandardMaterial({color:'#818d91',metalness:.65,roughness:.45}));rail.position.set(pack.x+1.05,pack.y+.07,pack.z+.4+i*.32);this.group.add(rail);\n  const ports=[];")
# Some bundles contain structural salvage as well as sealed flight supplies.
edit('game/src/habitat-build.js',"      g.add(label('CARGO '", "      if(i%2){for(let n=0;n<2;n++){const scrap=new THREE.Mesh(new THREE.BoxGeometry(.95,.035,.6),steel);scrap.position.set((n-.5)*.28,.94+n*.12,0);scrap.rotation.set(n*.16,0,(n-.5)*.3);g.add(scrap);}}\n      g.add(label('CARGO '")
edit('game/src/habitat-build.js',"label:'Recover cargo '+(i+1)+' · alloy, membrane and seals'", "label:'Recover salvage '+(i+1)+' · structural alloy and sealed flight supplies'")
# The old circuit lab treated soil as a zero-ohm return. Retain its useful solver,
# but represent the return as a conductive bonding bar with an explicit source bond.
p=root/'game/src/circuit-lab.js';s=p.read_text(encoding='utf-8')
s=s.replace('Each lithium-ion cell here gives','Each teaching battery module here gives')
s=s.replace('four 12 V Li-ion cells','four illustrative 12 V modules')
s=s.replace('ground rod','bonding bar').replace('Ground rod','Bonding bar')
s=s.replace('driven into the soil','connected by a continuous metal conductor')
s=s.replace('while standing on the ground','while also touching a conductor tied to the return')
s=s.replace('As little as 30 mA through a body is dangerous.','Body current depends on the contact and resistance; never test a live frame with your body.')
s=s.replace('Touch the frame while standing on the soil and','In this 1,000-ohm contact example, touching the frame and source return would let')
s=s.replace('mA would pass through you. That is dangerous.','mA flow through the contact. That is hazardous; this is a simulation.')
s=s.replace("'On Mars, grounding also bleeds away the <b>static charge</b> that blowing dust builds up on equipment. That protects electronics, and you.'", "'The return must be a continuous metal path to the protected source. Dry Martian soil is not a dependable fuse-clearing conductor. Static-charge control is a separate design task.'")
s=s.replace('The fault current went straight to ground and the 60 A fuse blew. The frame stayed at 0 V, safe to touch. That is why every power system on the outpost is grounded.', 'The fault current returned through the metal bond to the source and the 60 A fuse opened. In this model the frame is close to the reference voltage. A real repair still requires isolation and verification; a meter reading alone is not permission to touch.')
s=s.replace("new THREE.CylinderGeometry(.03, .03, .5, 12)","new THREE.BoxGeometry(.6, .09, .2)")
s=s.replace("rod.position.set(ROD.x, .2, ROD.z)","rod.position.set(ROD.x, .12, ROD.z)")
s=s.replace("terminal('G', ROD.x, .44, ROD.z", "terminal('G', ROD.x, .17, ROD.z")
s=s.replace('The frame is safe at 0 V, but the fault current has no way back to the battery, so the fuse never trips and the fault goes unnoticed.', 'The frame reads close to the reference, but a missing return bond can leave the fault undetected.')
# Remove an unreachable duplicate feedback branch left by the original implementation.
s='\n'.join(line for line in s.split('\n') if 'if (false) { feedback' not in line)
p.write_text(s,encoding='utf-8')
# Older habitat tests start after the new preparation sequence. The new test exercises prep itself.
edit('scripts/test-habitat-build.mjs',"const ids=[];", "assert.equal(marsObjective(o,c).id,'hab-exit');\no.habBuild.pioneer.exitedPod=true;o.habBuild.pioneer.collected=[0,1,2,3,4,5];o.habBuild.pioneer.surveyed=[0,1,2];\nconst ids=[];")
edit('scripts/test-habitat-build.mjs','length,5);','length,8);')
edit('scripts/test-mars-objectives.mjs','for(let i=0;i<6;i++){o.habBuild.step=i;',"assert.equal(marsObjective(o,c).id,'hab-exit');\no.habBuild.pioneer.exitedPod=true;o.habBuild.pioneer.collected=[0,1,2,3,4,5];o.habBuild.pioneer.surveyed=[0,1,2];\nfor(let i=0;i<6;i++){o.habBuild.step=i;")
edit('scripts/test-habitat-build-browser.py','    # 0 -> walk to the site', '''    # Preparation is exercised through the normal ray in test-pioneer-build-browser.py.
    page.evaluate("() => { const p=game.outpost.habBuild.pioneer;p.exitedPod=true;p.collected=[0,1,2,3,4,5];p.surveyed=[0,1,2];p.stock={alloy:18,membrane:12,seals:6};game.world.habBuild.apply(); }")
    # 0 -> walk to the site''')
edit('scripts/test-habitat-build-browser.py',"start['obj'] == 'hab-0'", "start['obj'] == 'hab-exit'")
edit('scripts/test-power-tutorial-browser.py',"out.groundRod = !!game.construction.groundRod;", "out.beforeBaseBond=!!game.construction.groundRod;o.powerStep=6;o.baseConnected=true;game.construction.update(false,null,false);out.groundRod = !!game.construction.groundRod;")
edit('scripts/test-power-tutorial-browser.py',"and r2['groundRod'], r2", "and not r2['beforeBaseBond'] and r2['groundRod'], r2")
edit('scripts/test-battery-bank-browser.py',"o.parts=30;o.panels=6;", "o.parts=30;o.panels=6;w.settlement.pack.visible=true;")
print('Completed integration and updated meaningful regression fixtures.')
