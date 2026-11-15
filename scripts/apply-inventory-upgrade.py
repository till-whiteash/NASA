from pathlib import Path
root=Path(r'C:\NASA\Zhetalis-Nasa-tutorial')
def edit(file,old,new):
 p=root/file;s=p.read_text(encoding='utf-8')
 if old not in s:raise SystemExit('Missing edit anchor: '+file+' '+old[:80])
 p.write_text(s.replace(old,new,1),encoding='utf-8')
edit('game/src/colony.js',"import { createRockContact } from './rock-contact.js';","import { createRockContact } from './rock-contact.js';\nimport {TOOL_SLOTS,SAMPLE_SLOTS,STACK_SIZE,sampleRoom,transferTool} from './inventory-state.js';")
edit('game/src/colony.js',"export const BELT = 2;          // your suit's tool belt holds 2 tools (game) - the rest wait in the base locker\nexport const BAG = 8;           // rock samples you can carry before you must unload at the base (game)","export const BELT = TOOL_SLOTS; // Six quick tool slots (game capacity).\nexport const BAG = SAMPLE_SLOTS*STACK_SIZE; // Maximum samples; partially filled stacks also occupy slots.")
edit('game/src/colony.js',"    for (const k of ORE_KEYS) { this.s.bag[k] ??= 0; this.s.store[k] ??= 0; }","    this.s.bag??={};this.s.store??={};\n    for (const k of ORE_KEYS) { this.s.bag[k] ??= 0; this.s.store[k] ??= 0; }")
start="  take(tool) {   // locker -> belt"
p=root/'game/src/colony.js';s=p.read_text(encoding='utf-8');a=s.index(start);b=s.index('  has(tool)',a)
s=s[:a]+"  take(tool) { if(!transferTool(this.s,tool,false))return false;this.equip();return true; }\n  store(tool) { if(!transferTool(this.s,tool,true))return false;this.equip();return true; }\n"+s[b:];p.write_text(s,encoding='utf-8')
edit('game/src/colony.js','  bagCount() { return count(this.s.bag); }','  bagCount() { return count(this.s.bag); }\n  sampleRoom(ore) { return sampleRoom(this.s.bag,ore); }')
edit('game/src/colony.js',"    const o = ORES[dep.ore];\n    const hits", "    const o = ORES[dep.ore];\n    if(this.sampleRoom(dep.ore)<o.yield)return {broke:false,full:true};\n    const hits")
edit('game/src/colony.js','    const room = BAG - this.bagCount(), got = Math.min(room, o.yield);','    const room = this.sampleRoom(dep.ore), got = Math.min(room, o.yield);')

edit('game/src/main.js',"import { Colony, newColony, ORES, TOOLS, CROPS, SHOP, GREENHOUSE, BAG, JUG_L, priceWords } from './colony.js';","import { Colony, newColony, ORES, TOOLS, CROPS, SHOP, GREENHOUSE, BAG, JUG_L, priceWords } from './colony.js';\nimport {openInventory} from './inventory.js';\nimport {TOOL_SLOTS,SAMPLE_SLOTS,usedSlots} from './inventory-state.js';\nimport {itemIcon} from './inventory-icons.js';")
edit('game/src/main.js',"Your belt only holds 2 tools.","Open the backpack (I) to check your six quick-tool slots.")
edit('game/src/main.js',"if (colony.bagCount() >= BAG) return toast(`🎒 Your sample bag is full (${BAG}). Unload it at the storage locker inside the base.`);","if (colony.sampleRoom(dep.ore) < ORES[dep.ore].yield) return toast('Your backpack needs room for this rock’s samples. Store a stack at the base locker.');")
edit('game/src/main.js',"if (r.full) return toast(`🎒 Your sample bag is full (${BAG}). Unload it at the storage locker inside the base.`);","if (r.full) return toast('Your backpack needs room for this rock’s samples. Store a stack at the base locker.');")
p=root/'game/src/main.js';s=p.read_text(encoding='utf-8');a=s.index('  tb.innerHTML = ',s.index('function drawToolbar()'));b=s.index('\n}',a)
s=s[:a]+'''  tb.innerHTML = `<button data-slot="-1" aria-pressed="${s.held===-1}" class="${s.held===-1?'held':''}" title="Empty hands (Q)"><small>Q</small><small>Hands</small></button>` + Array.from({length:TOOL_SLOTS},(_,i)=>s.belt[i]?`<button data-slot="${i}" aria-pressed="${i===s.held}" class="${i===s.held?'held':''}" title="${TOOLS[s.belt[i]].name}"><kbd>${i+1}</kbd>${itemIcon(s.belt[i])}<small>${TOOLS[s.belt[i]].name}${s.belt[i]==='jug'?` ${s.jug} L`:''}</small></button>`:`<div class="tool-slot-empty" aria-hidden="true">${i+1}</div>`).join('')
    + `<button class="inventory-launch" data-inventory title="Open backpack (I)">${itemIcon('backpack')}<small>Backpack · I</small><small>${usedSlots(s.bag)}/${SAMPLE_SLOTS} slots</small></button>`;
  tb.querySelectorAll('[data-slot]').forEach(b => (b.onclick = e => { e.stopPropagation(); selectPlayerTool(+b.dataset.slot); }));
  tb.querySelector('[data-inventory]').onclick=e=>{e.stopPropagation();if(!isModalOpen()&&!world?.cinematic)openBackpack();};''' +s[b:]
p.write_text(s,encoding='utf-8')
edit('game/src/main.js',"function openLocker() {\n  const unloaded = colony.unload(); if(unloaded){recordLesson(colony.s,'unload');saveGame();} if (unloaded) toast(`🪨 Unloaded ${unloaded} rock sample${unloaded === 1 ? '' : 's'} into storage.`);\n  const s = colony.s, o = outpost, link = o.today.link, beltFull = s.belt.length >= 2;",'''function openBackpack(atLocker=false) {
  return openInventory({colony,outpost,atLocker,onChange:()=>{toolbarKey='';missionKey='';saveGame();drawToolbar();},onLesson:id=>recordLesson(colony.s,id),onServices:openLockerServices,onKits:()=>advancePower(0)});
}
function openLocker(){return openBackpack(true);}
function openLockerServices() {
  const s = colony.s, o = outpost, link = o.today.link;''')
edit('game/src/main.js',"modal({ pause: false, title: '🗄 Storage locker', html: `","modal({ title: 'Base supplies & trade', html: `")
p=root/'game/src/main.js';s=p.read_text(encoding='utf-8');a=s.index('    <div class="inv-grid">',s.index('function openLockerServices()'));b=s.index('    <h4>📡 Trade with Earth',a);s=s[:a]+s[b:]
a=s.index('function openLockerServices()');b=s.index('// A greenhouse you built:',a);chunk=s[a:b]
chunk=chunk.replace("choices: [{ label: 'Done', primary: true }]", "choices: [{ label: 'Back to inventory', primary: true, onPick:openLocker }]")
chunk=chunk.replace("again = () => { toolbarKey = ''; openLocker(); }", "again = () => { toolbarKey = ''; saveGame(); openLockerServices(); }")
chunk='\n'.join(line for line in chunk.split('\n') if not any(anchor in line for anchor in ["querySelectorAll('[data-take]')","querySelectorAll('[data-store]')","querySelector('[data-fill]')"]))
s=s[:a]+chunk+s[b:];p.write_text(s,encoding='utf-8')
edit('game/src/main.js',"  if (code === 'KeyB') { openBuild(); return; }","  if (code === 'KeyI') { openBackpack(); return; }\n  if (code === 'KeyB') { openBuild(); return; }")
edit('game/src/main.js',"if ((code === 'Digit1' || code === 'Digit2') && colony)","if (/^Digit[1-6]$/.test(code) && colony)")
edit('game/src/main.js',"colony.bagCount() >= BAG ? ' (bag full!)' : ''","colony.sampleRoom(near.deposit.ore) < ORES[near.deposit.ore].yield ? ' (backpack needs room)' : ''")

edit('game/src/player-tutorial.js','Press 1 or 2, or tap a tool in your belt. The highlighted slot is equipped. Take the builder from the storage locker; your belt holds two tools.','Press 1–6, or tap a quick-tool slot. The highlighted tool is equipped. Open your backpack with I to inspect items. Take the builder from the base locker; you have six quick-tool slots.')
edit('game/src/player-tutorial.js','Go inside and use the storage locker. Opening it unloads your bag automatically. Builders spend stored materials, not samples still in your bag.','Go inside and use the storage locker. Choose Store all samples, or select a stack and store just that stack. Builders use stored materials. Your backpack has 24 slots with up to 64 samples per stack.')
edit('game/src/player-tutorial.js','Use Take to move a tool onto your two-slot belt.','Choose Base locker, select a tool, then Take to quick tools. Store all samples makes your minerals available to the Builder.')
edit('game/src/player-tutorial.js','Equip the pickaxe (1 or 2 / tap its slot)','Equip the pickaxe (1–6 / tap its slot)')
edit('game/index.html','  <link rel="stylesheet" href="settings.css?v=surface-missions-92">','  <link rel="stylesheet" href="settings.css?v=surface-missions-92">\n  <link rel="stylesheet" href="inventory.css?v=inventory-1">')
print('Inventory hooks applied to the tutorial checkout.')
