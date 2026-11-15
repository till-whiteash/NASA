// Explanations use the same forecast and crop results as the simulation.
// No inferred battery charge: battery is storage CAPACITY in this teaching model.
export function powerSnapshot(o){const f=o.forecast();return {life:o.split.life,science:o.split.science,comms:o.split.comms,o2Net:f.o2Net,scienceRate:f.science,link:f.link,total:f.total,heater:f.heater,cold:f.cold,battery:o.battery};}
const number=n=>Number(n).toFixed(1);
const journal=o=>(o.learning??={next:1,entries:[],active:[]});
function append(o,entry){const j=journal(o);const e={...entry,id:j.next++,sol:o.sol};j.entries.push(e);j.entries=j.entries.slice(-18);return e;}
export function recordPowerChoice(o,before){
 const after=powerSnapshot(o);
 if(['life','science','comms'].every(k=>Math.abs(before[k]-after[k])<.005))return null;
 return append(o,{kind:'decision',title:'You changed the power budget',before,after,
  cause:`Life support ${Math.round(before.life*100)}% → ${Math.round(after.life*100)}%; science ${Math.round(before.science*100)}% → ${Math.round(after.science*100)}%.`,
  effect:`Predicted oxygen balance ${number(before.o2Net)} → ${number(after.o2Net)} kg/sol; science ${number(before.scienceRate)} → ${number(after.scienceRate)}/sol.`,
  next:'Check the oxygen forecast before committing spare power to science. Changing a slider is a prediction, not a completed sol.',
  question:'What evidence tells you whether this choice can support the crew?',
  options:['The oxygen balance compared with crew demand','The number of fact cards collected','The size of the habitat'],correct:0,
  explanation:`Your new forecast is ${number(after.o2Net)} kg oxygen/sol after crew demand. ${after.o2Net<0?'A negative balance uses stored air; raise life support or restore energy supply.':'A non-negative balance covers demand under these conditions; dust and faults can change it.'}`});
}
export function explainBase(o,c={},notes=null){
 const f=o.forecast(),result=[],beds=[...(c.base||[]),...(c.greenhouses||[])].filter(b=>b.crop&&!b.ready);
 const add=(key,title,cause,effect,next,question,options,correct,explanation)=>result.push({key,title,cause,effect,next,question,options,correct,explanation});
 const unpowered=notes?notes.some(n=>n.type==='unpowered'):beds.length&&f.total*o.split.life<1;
 const thirsty=notes?notes.some(n=>n.type==='thirsty'):beds.some(b=>b.tank<=0);
 if(unpowered)add('crop-power','Grow lights have too little power',`Your life-support allocation supplies ${number(f.total*o.split.life)} kWh; crop growth needs at least 1 in this simulation.`, notes?'The planted beds did not grow this sol.':'Planted beds will wait with the current allocation.', 'Increase life support, or restore the connected array if generation is low. Extra storage alone does not make electricity.', 'Which change addresses this measured shortage?', ['Add shielding','Restore generation or allocate more power to life support','Wait with the same power budget'],1,'Crop growth checks the life-support allocation. Storage capacity cannot replace missing generation or an insufficient allocation.');
 if(thirsty)add('crop-water','A crop needs water', 'A planted bed has less water than its daily requirement.', 'That bed waits instead of growing.', 'Use its water control to refill from the clean tank. Process ice if the clean tank is empty.', 'What would restart this bed?', ['Add a battery','Refill the bed with clean water','Increase science power'],1,'The growth check found too little water. Electricity and water are separate requirements.');
 if(f.cold)add('cold-night','Night storage is too small',`You have ${number(o.battery)} kWh of storage for a ${number(f.heater)} kWh night-heater requirement.`, 'Cold conditions reduce oxygen production by 30% and halve growth in beds that have power and water.', 'Place and wire another battery. Moving the science slider does not change the fixed heater requirement in this model.', 'Why would extra storage help here?', ['It creates more sunlight','It removes the need for water','It can cover the night-heater requirement'],2,'Capacity must meet the night demand. The model compares storage capacity with the heater requirement; it does not simulate a measured battery state of charge.');
 if(f.o2Net<0)add('oxygen','Stored oxygen is being used',`The oxygen plant produces ${number(f.o2)} kg/sol; the crew needs ${number(o.o2Need)}.`, `The forecast uses ${number(-f.o2Net)} kg of stored air each sol.`, 'Increase life support and check generation, cold conditions and leaks. Ice processing fills the water tank; it does not directly replenish cabin oxygen here.', 'Which forecast would stop this drain?', ['Oxygen production at least matching crew demand','A bigger logbook','More prepared meals'],0,'Compare oxygen made with oxygen breathed. A positive balance rebuilds the reserve; a negative one consumes it.');
 if(o.baseConnected&&o.dust>0)add('dust','Dust is cutting solar output', 'The current storm applies the game’s 35% sunlight factor, alongside panel cleanliness.', `Your array currently supplies ${number(f.solar)} kWh/sol.`, 'Keep critical life support supplied and postpone optional demand. Cleaning helps surface dust, but cannot clear a storm from the sky.', 'Why can clean panels still produce less during a storm?', ['The crew is inside','Airborne dust still blocks sunlight','Batteries make the panels dirty'],1,'Surface dirt and dust in the sky are different losses. Cleaning changes one, not both.');
 return result;
}
export function observeConsequences(o,c,notes){
 const j=journal(o),issues=explainBase(o,c,notes),fresh=[];
 for(const issue of issues)if(!j.active.includes(issue.key))fresh.push(append(o,{...issue,kind:'outcome'}));
 j.active=issues.map(i=>i.key);return fresh;
}
export function recordStarter(o){
 if(journal(o).entries.some(e=>e.kind==='build'))return;
 append(o,{kind:'build',title:'You assembled the supply rack',cause:'You recovered a cargo bundle and unfolded its packing frame.',effect:'A real rack now stands at the site; the habitat-material budget is unchanged.',next:'Recover the remaining supplies and survey the habitat site.',question:'Why did your habitat-material stock stay unchanged?',options:['All construction is free','The rack reused its own packing frame','The game added more alloy'],correct:1,explanation:'This starter kit reuses packaging. Later habitat frames spend recovered alloy and membrane; the first task does not remove those costs.'});
}
export function answerReflection(o,id,choice){
 const e=journal(o).entries.find(e=>e.id===id);if(!e||!Number.isInteger(choice)||choice<0||choice>=e.options.length)return null;
 e.reflection={choice,correct:choice===e.correct};return {correct:e.reflection.correct,text:e.explanation};
}
