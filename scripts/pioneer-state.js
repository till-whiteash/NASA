// Construction inventory and survey results are saved with habBuild, never inferred from a film.
export const SALVAGE_COUNT=6, SURVEY_COUNT=3, SURVEY_SECONDS=3;
export const COSTS={frame:{alloy:2,membrane:1,seals:0},shell:{alloy:0,membrane:6,seals:2},airlock:{alloy:2,membrane:0,seals:4}};
export const newPioneer=()=>({version:1,exitedPod:false,calibrator:false,collected:[],surveyed:[],stock:{alloy:0,membrane:0,seals:0},spent:[]});
export const pioneerReady=b=>!b?.pioneer||(b.pioneer.exitedPod&&b.pioneer.collected.length===SALVAGE_COUNT&&b.pioneer.surveyed.length===SURVEY_COUNT);
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
 if(p.collected.length<SALVAGE_COUNT)return {...base,id:'hab-salvage',title:'Recover your building cargo',step:`${p.collected.length}/${SALVAGE_COUNT} cargo bundles recovered · ${stockText(b)}`,detail:'Follow the marker to the orange cargo bundles. Walk up, aim and press E / Action to unpack each one. Recover alloy, folded pressure membranes and seal kits. The first bundle also contains a calibrator. These are inspected flight supplies, not random rocks turned into electronics.'};
 return {...base,id:'hab-survey',title:'Calibrate the building site',step:`${p.surveyed.length}/${SURVEY_COUNT} survey checks complete`,detail:'Use each blue survey instrument and stay within 3 metres for its measurement. Check the footing levels, the module spacing and a clear airlock approach. Adjustable footings carry the habitat loads; a pressure shell still needs a frame and verified seals.'};
}
export function pioneerLog(b){if(!b?.pioneer)return [];const p=b.pioneer;return [
 {title:'Leave the landing pod',done:p.exitedPod},
 {title:'Recover six building cargo bundles',done:p.collected.length===SALVAGE_COUNT},
 {title:'Calibrate three survey points',done:p.surveyed.length===SURVEY_COUNT}
];}
