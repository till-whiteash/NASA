// Tutorial completion follows actions; opening a help page never completes a lesson.
export function recordLesson(s,key){(s.tutorial??={})[key]=true;}
export function tutorialLessons(o,s){const t=s.tutorial||{},p=o.habBuild?.pioneer;return [
 ...(p?[
 {title:'Leave the pod safely',done:p.exitedPod,text:'Follow the hatch marker. Press E / Action, wait for PRESSURE MATCHED, then press E / Action again to open the outer hatch. Your checked suit is already on.'},
 ...(p.starterBuilt!==undefined?[{title:'Build your first supply rack',done:p.starterBuilt,text:'Open an orange bundle, then follow the marker to the green rack beside cargo 1. Aim and press E / Action. It reuses its packing frame. Suit air and the base clock start after this practice build.'}]:[]),
 {title:'Find your building supplies',done:p.collected.length===6,text:'Follow the marker to an orange cargo bundle, walk close and press E / Action. The next bundle is marked automatically. Six bundles contain all the structural supplies for your first habitat.'},
 {title:'Use the calibrator',done:p.surveyed.length===3,text:'Go to the marked blue instrument. Press E / Action and stand nearby until the check finishes. Repeat at the other two instruments. Walking away cancels a measurement; you can try again.'},
 {title:'Build your first home',done:o.habBuild.step>=6,text:'Left click / tap Mine with the pickaxe to clear the four marked rocks. Then use each glowing footprint to build a frame. Follow the marker to fit shells, airlocks and finally open the green pressure valve.'}
 ]:[]),
 {title:'Equip a tool',done:!!t.equip,text:'Press 1–6, or tap a quick-tool slot. The highlighted tool is equipped. Open your backpack with I to inspect items. Take the builder from the base locker; you have six quick-tool slots.'},
 {title:'Put it away',done:!!t.unequip,text:'Press the same number again, press Q, or tap Empty hands. On a phone, tap the selected tool again. This keeps the tool in your belt.'},
 {title:'Mine a mineral deposit',done:!!t.mine||s.seenOre?.length>0,text:'Equip the pickaxe. Aim at a mineral deposit and left click / tap Mine several times. E / Inspect examines it without damage. Ordinary rubble clears space but gives no mineral samples.'},
 {title:'Unload your samples',done:!!t.unload,text:'Go inside and use the storage locker. Choose Store all samples, or select a stack and store just that stack. Builders use stored materials. Your backpack has 24 slots with up to 64 samples per stack.'},
 {title:'Choose a project',done:!!s.buildPlan||!!t.track,text:'Press B or choose Builder in the menu. Select Track materials & build. The quest shows the next missing material and marks the nearest matching deposit.'},
 {title:'Print the parts',done:o.powerStep>1||!!(o.powerLearn&&o.powerLearn.printed.length>=4),text:'Go to the 3D printer in the workshop pod and press E / Action. Print the support frame, connectors, battery tray and fuse holder. Solar cells and controller chips came from Earth: printers cannot make semiconductors.'},
 {title:'Circuit training',done:o.powerStep>1||!!(o.powerLearn&&o.powerLearn.lab.series&&o.powerLearn.lab.parallel&&o.powerLearn.lab.ground),text:'At the workbench, wire four 12 V cells in series (voltages add: 48 V), then as two strings in parallel (same voltage, more amp-hours), then ground the metal frame and watch a fault trip the fuse.'},
 {title:'Assemble the solar kit',done:o.powerStep>=2,text:'Take the power kits from the locker. At the workbench, fit Support frame, Solar module, then Output connector into matching slots.'},
 {title:'Clear and place the array',done:o.powerStep>=3,text:'Follow the field marker. Break all four marked site rocks with the pickaxe, then use each of the three panel footprints.'},
 {title:'Assemble and place the battery',done:o.powerStep>=5,text:'Fit Battery module, Charge controller, then Protected output at the workbench. Walk to the battery slot beside the panels and press X or tap Place battery.'},
 {title:'Connect solar to battery',done:o.powerStep>=6,text:'Each socket has a red + and a black − terminal. Pick up the red + lead at Solar array OUT and connect it to the red + at Battery controller IN, then do the same with the black − lead. Current only flows round a closed loop: out of +, through the load, back into −. Purple marks the matching socket. R / Drop cancels.'},
 {title:'Power the base',done:!!o.baseConnected,text:'Connect Battery protected OUT to Base IN at Airlock 01: red + to red + first, then black − to black −. Never join + to −: that reverses the current or makes a short circuit. Grey sockets need an earlier step; green sockets are already connected.'},
 {title:'Charge the rover',done:!!o.roverCharged,text:'Assemble and place the charger when its quest appears. Connect Base charger OUT to Rover charger IN, then park and stop in the cyan bay. Charging needs available power; a full battery cannot gain more charge.'},
 {title:'Grow your first meal',done:!!s.farmQuest?.rewarded,text:'Follow each food quest: collect ice, process safe water, request seeds, collect the marked delivery, plant, water, harvest, then prepare food at the locker. The current quest shows the next unfinished step.'},
 {title:'Build an expansion',done:Object.values(s.buildHistory||{}).some(n=>n>0),text:'Unload the recipe materials, equip the builder and go outside. Open Builder. A greenhouse needs flat, clear ground; batteries and panels expand the existing power field. Locked recipes explain what is missing.'}
];}
export function questHelp(task){
 if(task.id?.startsWith('hab-')||task.id?.startsWith('bank-'))return (task.step?task.step+'. ':'')+task.detail;
 if(task.target==='workbench')return 'Go inside to the workbench marker. Press E / Action. For assembly, take a part from the front row, then select its matching highlighted slot.';
 if(task.target==='locker')return 'Enter the base and follow the indoor locker marker. Press E / Action at the storage locker. Choose Base locker, select a tool, then Take to quick tools. Store all samples makes your minerals available to the Builder.';
 if(task.target==='build-ore')return 'Follow the quest marker to the mineral deposit. Equip the pickaxe (1–6 / tap its slot), aim at the rock and left click / tap Mine repeatedly. E / Inspect examines it without mining.';
 if(task.id==='power-2')return 'At the remote field, left click / tap Mine to clear the four marked rocks with the pickaxe. Then aim at each highlighted panel footprint and press E / Action.';
 if(task.id==='power-5'||task.id==='base'||task.id==='charger-2')return 'Aim at the red + terminal of the named OUT socket and press E / Action, walk to the red + terminal of the matching IN socket and use it. Then repeat with the black − leads to close the loop. The cable preview and quest marker guide you. R / Drop cancels.';
 return task.detail;
}
