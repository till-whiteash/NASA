import {modal,$} from './ui.js';
import {ORES,TOOLS,CROPS,JUG_L} from './colony.js';
import {SAMPLE_SLOTS,STACK_SIZE,TOOL_SLOTS,sampleStacks,usedSlots,transferSamples} from './inventory-state.js';
import {itemIcon} from './inventory-icons.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tile=(row,selected)=>`<button type="button" class="inventory-slot ${row.id===selected?'selected':''}" data-item="${escape(row.id)}" aria-pressed="${row.id===selected}" aria-label="${escape(row.name)}, ${row.count}${row.unit?' '+row.unit:''}">${itemIcon(row.icon||row.key)}<span class="item-count">${row.count}${row.unit?' '+row.unit:''}</span><span class="item-name">${escape(row.name)}</span></button>`;
const sampleRows=counts=>sampleStacks(counts).map(r=>({...r,name:ORES[r.key].name,description:ORES[r.key].desc}));
const toolRow=key=>({id:'tool:'+key,key,kind:'tool',count:1,name:TOOLS[key].name,description:TOOLS[key].desc});

export function openInventory({colony,outpost,atLocker=false,onChange=()=>{},onLesson=()=>{},onServices=()=>{},onKits=()=>{}}){
 const s=colony.s;
 let view='bag',filter='',page=0,selected=null,notice='Select an item to see what it does.';
 const close=modal({title:atLocker?'Backpack & base locker':'Your backpack',html:'<div id="inventory-content"></div>',choices:[{label:'Back to game',primary:true}],onClose:()=>box.classList.remove('inventory-modal')});
 const box=$('#modal .modal-box');box.classList.add('inventory-modal');
 const root=box.querySelector('#inventory-content');
 const changed=()=>{onChange();render();};
 function baseRows(){
  return [...s.locker.filter(k=>TOOLS[k]).map(toolRow),...sampleRows(s.store),
   ...Object.entries(CROPS).filter(([k])=>s.seeds[k]>0).map(([key,c])=>({id:'seed:'+key,key,kind:'seed',name:key==='potato'?'Seed potatoes':c.name+' seeds',count:s.seeds[key],description:'Stored safely at the base. Plant these at a powered grow bed.'})),
   ...[
    ['parts','Spare parts',outpost.parts,'parts','Use these with stored minerals to build and repair equipment.'],
    ['food','Sealed rations',outpost.rations,'food','Move these into the galley from Base supplies & trade.'],
    ['produce','Fresh harvest',s.produce,'produce','Prepare these portions at Base supplies & trade.'],
    ['water','Clean water',s.tank,'water','Water is piped into the base tank. Take your jug, then fill it here.','L'],
    ['raw-water','Untreated water',s.rawWater,'water','Process and check this water at the life-support water plant.','L'],
    ['ice','Collected ice',s.ice,'silica','Melt this at the water plant, then purify and check the water.']
   ].filter(r=>r[2]>0).map(([id,name,count,icon,description,unit])=>({id,key:id,kind:'supply',name,count,icon,description,unit}))];
 }
 function cargoRows(){
  const p=outpost.habBuild?.pioneer, rows=[];
  for(const [key,name] of [['alloy','Structural alloy'],['membrane','Pressure membrane'],['seals','Airlock seals']])if(p?.stock[key]>0)rows.push({id:'cargo:'+key,key,name,count:p.stock[key],kind:'cargo',description:'Recovered mission cargo. Your habitat construction uses it automatically at the correct build step.'});
  if(p?.calibrator)rows.push({id:'cargo:calibrator',key:'calibrator',name:'Calibrator',count:1,kind:'cargo',description:'Aim at the marked survey instrument and press E / Action. Stay nearby while it measures.'});
  if(outpost.powerStep>=1&&outpost.powerStep<3)rows.push({id:'cargo:solar',key:'solar',name:'Solar array kit',count:1,kind:'cargo',description:'Assemble it at the workbench, then place the three panels at their marked footprints.'});
  if(outpost.powerStep>=1&&outpost.powerStep<5)rows.push({id:'cargo:battery',key:'battery',name:'Battery kit',count:1,kind:'cargo',description:'Follow the workbench lesson, then place the assembled cabinet at the field marker.'});
  return rows;
 }
 function render(focus=null){
  const rows=view==='bag'?sampleRows(s.bag):baseRows(),tools=s.belt.filter(k=>TOOLS[k]).map(toolRow),cargo=cargoRows();
  const all=[...rows,...tools,...cargo],active=all.find(r=>r.id===selected);
  const visible=rows.filter(r=>r.name.toLowerCase().includes(filter.toLowerCase()));
  const pages=Math.max(1,Math.ceil(visible.length/SAMPLE_SLOTS));page=Math.min(page,pages-1);
  const slots=visible.slice(page*SAMPLE_SLOTS,(page+1)*SAMPLE_SLOTS);
  const empty=Array.from({length:Math.max(0,SAMPLE_SLOTS-slots.length)},()=>'<div class="inventory-slot empty" aria-hidden="true"><span>+</span></div>').join('');
  root.innerHTML=`<div class="inventory-intro"><p>${atLocker?'Choose what to carry. Store samples here so the Builder can use them.':'Your tools and samples travel with you. Visit the base locker to move supplies.'}</p><span class="inventory-capacity">${usedSlots(s.bag)} / ${SAMPLE_SLOTS} backpack slots <small>64 samples per stack</small></span></div>
   <div class="inventory-hotbar"><h4>Quick tools <small>Press 1–6 to equip · Q for empty hands</small></h4><div class="inventory-tools">${Array.from({length:TOOL_SLOTS},(_,i)=>tools[i]?`<button class="quick-tool ${s.held===i?'equipped':''}" data-tool="${i}" aria-label="Inspect ${escape(tools[i].name)}"><kbd>${i+1}</kbd>${itemIcon(tools[i].key)}<span>${escape(tools[i].name)}</span>${s.held===i?'<small>Equipped</small>':''}</button>`:`<div class="quick-tool empty"><kbd>${i+1}</kbd><span>Empty</span></div>`).join('')}</div></div>
   <div class="inventory-nav"><div role="tablist" aria-label="Storage location"><button role="tab" aria-selected="${view==='bag'}" data-view="bag">Backpack</button><button role="tab" aria-selected="${view==='base'}" data-view="base">Base locker${!atLocker?' · view only':''}</button></div><input type="search" id="inventory-search" value="${escape(filter)}" placeholder="Find an item…" aria-label="Find an inventory item"></div>
   <div class="inventory-layout"><section class="inventory-storage" aria-label="${view==='bag'?'Backpack':'Base locker'} items"><div class="inventory-grid">${slots.map(r=>tile(r,selected)).join('')}${empty}</div><div class="inventory-grid-note"><span>${view==='bag'?'24 slots · stacks combine automatically':'Base storage grows as you collect more.'}</span><div>${pages>1?`<button data-page="-1" ${page===0?'disabled':''} aria-label="Previous inventory page">‹</button> ${page+1} / ${pages} <button data-page="1" ${page===pages-1?'disabled':''} aria-label="Next inventory page">›</button>`:''}</div></div>${!slots.length?`<p class="inventory-empty-note">${filter?'No matching items. Try another name.':view==='bag'?'Your sample backpack is empty. Mine a mineral deposit with the pickaxe.':'Nothing stored here yet.'}</p>`:''}</section>
   <aside class="inventory-detail" aria-label="Selected item">${active?`${itemIcon(active.icon||active.key)}<h4>${escape(active.name)}</h4><p>${escape(active.description)}</p><span class="inventory-item-location">${active.kind==='cargo'?'Mission cargo':active.kind==='tool'?(s.belt.includes(active.key)?'In your quick tools':'In the base locker'):(view==='bag'?'In your backpack':'In the base locker')} · ${active.count}${active.unit?' '+active.unit:''}</span><div class="inventory-item-actions">${actions(active)}</div>`:`${itemIcon('backpack')}<h4>What’s in your kit?</h4><p>Pick a square to inspect its item and see your choices.</p><p>Numbers show how many you have. Matching samples share a stack.</p>`}</aside></div>
   <div class="inventory-bottom"><p role="status" aria-live="polite">${escape(notice)}</p><button data-unload ${!atLocker||!colony.bagCount()?'disabled':''}>Store all samples</button></div>
   ${cargo.length?`<details class="inventory-cargo"><summary>Mission cargo · carried separately</summary><div>${cargo.map(r=>tile(r,selected)).join('')}</div></details>`:''}
   ${atLocker?`<div class="inventory-base-actions">${outpost.powerStep===0?'<button class="primary" data-kits>Collect landed power kits</button>':''}<button data-services>Base supplies & trade</button><small>Food, seed deliveries and orders from Earth</small></div>`:'<p class="inventory-remote-note">Base supplies stay at the base. Use its storage locker to transfer items.</p>'}`;
  root.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{selected=b.dataset.item;render(`[data-item="${selected}"]`);});
  root.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{selected='tool:'+s.belt[+b.dataset.tool];render(`[data-tool="${b.dataset.tool}"]`);});
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;page=0;selected=null;render(`[data-view="${view}"]`);});
  root.querySelector('#inventory-search').oninput=e=>{filter=e.target.value;page=0;render('#inventory-search');};
  root.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page+=+b.dataset.page;render();});
  root.querySelector('[data-unload]').onclick=()=>{if(!atLocker)return;const n=colony.unload();if(n){onLesson('unload');notice=`Stored ${n} samples. The Builder can use them now.`;changed();}};
  root.querySelector('[data-services]')?.addEventListener('click',()=>{close();onServices();});
  root.querySelector('[data-kits]')?.addEventListener('click',()=>{onKits();notice='Power kits collected. Follow the workbench marker.';changed();});
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>act(b.dataset.action,active));
  if(focus){const el=root.querySelector(focus);el?.focus();if(el?.type==='search')el.setSelectionRange?.(filter.length,filter.length);}
 }
 function actions(item){
  if(item.kind==='tool')return `${s.belt.includes(item.key)?'<button class="primary" data-action="equip">'+(colony.tool===item.key?'Put tool in belt':'Equip tool')+'</button>':''}<button data-action="tool-transfer" ${!atLocker||(!s.belt.includes(item.key)&&s.belt.length>=TOOL_SLOTS)?'disabled':''}>${s.belt.includes(item.key)?'Put in base locker':'Take to quick tools'}</button>${item.key==='jug'?`<button data-action="fill" ${!atLocker||!colony.has('jug')||s.tank<=0||s.jug>=JUG_L?'disabled':''}>Fill jug · ${s.jug}/${JUG_L} L</button>`:''}`;
  if(item.kind==='sample')return `<button class="primary" data-action="stack" ${!atLocker?'disabled':''}>${view==='bag'?'Store':'Take'} this stack</button><button data-action="one" ${!atLocker?'disabled':''}>${view==='bag'?'Store':'Take'} 1 sample</button>`;
  if(item.kind==='cargo')return '<p>Follow the mission marker to use this item. It does not take up sample slots.</p>';
  return atLocker?'<button data-action="services">Base supplies & trade</button>':'<p>Use the locker inside the base to manage these supplies.</p>';
 }
 function act(action,item){
  if(!item)return;
  if(action==='equip'){colony.select(s.belt.indexOf(item.key));onLesson(colony.tool?'equip':'unequip');notice=colony.tool?`${item.name} equipped.`:'Empty hands. The tool stays on your belt.';changed();return;}
  if(!atLocker)return;
  if(action==='tool-transfer'){const taking=!s.belt.includes(item.key),ok=taking?colony.take(item.key):colony.store(item.key);if(ok){onLesson(taking?'equip':'store');notice=taking?`${item.name} is in your quick tools.`:`${item.name} is in the base locker.`;changed();}return;}
  if(action==='stack'||action==='one'){const n=transferSamples(s,item.key,view==='bag',action==='one'?1:item.count);notice=n?`${view==='bag'?'Stored':'Took'} ${n} ${item.name.toLowerCase()} sample${n===1?'':'s'}.`:'Your backpack has no room for this item. Store a stack first.';if(n&&view==='bag')onLesson('unload');changed();return;}
  if(action==='fill'){const n=colony.fillJug();notice=`Added ${n} L to your jug.`;changed();return;}
  if(action==='services'){close();onServices();}
 }
 render();return close;
}
