// Construction inventory and survey results are saved with habBuild, never inferred from a film.
export const SALVAGE_COUNT=6, SURVEY_COUNT=3, SURVEY_SECONDS=3;
export const COSTS={frame:{alloy:2,membrane:1,seals:0},shell:{alloy:0,membrane:6,seals:2},airlock:{alloy:2,membrane:0,seals:4}};
export const newPioneer=()=>({version:2,exitedPod:false,starterBuilt:false,calibrator:false,collected:[],surveyed:[],stock:{alloy:0,membrane:0,seals:0},spent:[]});
// Only new missions have this practice task; old saves never gain a new gate.
export const openingPractice=o=>o?.habBuild?.pioneer?.starterBuilt===false;
export function buildStarter(b){const p=b?.pioneer;if(!p?.exitedPod||p.starterBuilt!==false||!p.collected.length)return false;p.starterBuilt=true;return true;}
export const pioneerReady=b=>!b?.pioneer||(b.pioneer.starterBuilt!==false&&b.pioneer.exitedPod&&b.pioneer.collected.length===SALVAGE_COUNT&&b.pioneer.surveyed.length===SURVEY_COUNT);
export function collectSalvage(b,id){
 const p=b?.pioneer;
 if(!p||!p.exitedPod||!Number.isInteger(id)||id<0||id>=SALVAGE_COUNT||p.collected.includes(id))return false;
 p.collected.push(id);p.calibrator=true;p.stock.alloy+=3;p.stock.membrane+=2;p.stock.seals+=1;return true;
}
export function recordSurvey(b,id){
 const p=b?.pioneer;
 if(!p?.calibrator||p.collected.length!==SALVAGE_COUNT||!Number.isInteger(id)||id<0||id>=SURVEY_COUNT||p.surveyed.includes(id))return false;
 p.surveyed.push(id);return true;
}
export const stockText=b=>b?.pioneer?`${b.pioneer.stock.alloy} alloy · ${b.pioneer.stock.membrane} membrane · ${b.pioneer.stock.seals} seal kits`:'Flight cargo available';
export function spendFor(b,kind,id=kind){
 const p=b?.pioneer;if(!p)return {ok:true}; // Existing in-progress saves keep their original build rules.
 const key=kind+':'+id,cost=COSTS[kind];
 if(!cost)return {ok:false,why:'Unknown part.'};
 if(p.spent.includes(key))return {ok:false,why:'Already installed.'};
 if(!pioneerReady(b))return {ok:false,why:'Collect all six cargo bundles and calibrate all three survey points first.'};
 if(Object.entries(cost).some(([k,n])=>p.stock[k]<n))return {ok:false,why:'Not enough recovered cargo. '+stockText(b)};
 for(const [k,n] of Object.entries(cost))p.stock[k]-=n;
 p.spent.push(key);return {ok:true};
}
export function pioneerObjective(b){
 if(!b?.pioneer||b.step!==0||pioneerReady(b))return null;
 const p=b.pioneer,base={target:'hab'};
 if(!p.exitedPod)return {...base,id:'hab-exit',title:'Leave your landing pod',step:'Find the hatch · E / Action · complete the airlock cycle',detail:'Your checked suit is already on. The pod supplies air and shelter until you build the habitat. Use the hatch, wait for pressure to match, then open the outer hatch.'};
 if(p.starterBuilt===false&&p.collected.length)return {...base,id:'hab-starter',title:'Build your first supply rack',step:'Aim at the green rack beside cargo 1 · E / Action to assemble',detail:'Unfold the rack supplied with your cargo. It keeps equipment off the ground. This practice build reuses the packing frame, so no habitat materials are spent. Suit air and the base clock resume after you finish.'};
 if(p.collected.length<SALVAGE_COUNT)return {...base,id:'hab-salvage',title:p.collected.length?'Recover the remaining cargo':'Open your first cargo bundle',step:`Follow the orange marker · E / Action · ${p.collected.length}/${SALVAGE_COUNT} recovered`,detail:'Walk to an orange bundle, aim at it and press E / Action. It contains inspected building supplies and a calibrator. The first bundle also supplies your practice rack.'};
 return {...base,id:'hab-survey',title:'Calibrate the building site',step:`Use a blue survey instrument · ${p.surveyed.length}/${SURVEY_COUNT} checked`,detail:'Use each blue survey instrument and stay within 3 metres for its measurement. Check the footing levels, the module spacing and a clear airlock approach. Adjustable footings carry the habitat loads; a pressure shell still needs a frame and verified seals.'};
}
export function pioneerLog(b){if(!b?.pioneer)return [];const p=b.pioneer;return [
 {title:'Leave the landing pod',done:p.exitedPod},
 ...(p.starterBuilt!==undefined?[{title:'Build the first supply rack',done:p.starterBuilt}]:[]),
 {title:'Recover six building cargo bundles',done:p.collected.length===SALVAGE_COUNT},
 {title:'Calibrate three survey points',done:p.surveyed.length===SURVEY_COUNT}
];}
