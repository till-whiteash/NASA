// Additional equal-voltage packs join the protected bus in parallel, never in series.
// Older saves already credited their upgrades; do not charge them twice or disconnect them.
export const wiredBatteries=o=>o.batteryBank?o.batteryBank.connected.filter(i=>i<o.upgrades.battery).length:(o.upgrades?.battery||0);
export function queueBattery(o){
 const old=o.upgrades.battery||0;
 o.batteryBank??={connected:Array.from({length:old},(_,i)=>i),placed:Array.from({length:old},(_,i)=>i),checked:[],leads:{}};
 o.upgrades.battery=old+1;return old;
}
export function placeBank(o,i){const b=o.batteryBank;if(!b||i<0||i>=o.upgrades.battery||b.placed.includes(i))return false;b.placed.push(i);return true;}
export function checkBank(o,i){const b=o.batteryBank;if(!b?.placed.includes(i)||!o.baseConnected||b.connected.includes(i))return false;if(!b.checked.includes(i))b.checked.push(i);return true;}
export function connectBank(o,i,pole,targetPole,kWh){
 const b=o.batteryBank;
 if(!b?.checked.includes(i)||!o.baseConnected||b.connected.includes(i))return {ok:false,reason:'check'};
 if(!['+','-'].includes(pole)||pole!==targetPole)return {ok:false,reason:'reverse'};
 const leads=b.leads[i]??=[];if(!leads.includes(pole))leads.push(pole);
 const complete=leads.includes('+')&&leads.includes('-');
 if(complete){b.connected.push(i);o.battery+=kWh;}
 return {ok:true,complete};
}
export function bankObjective(o){
 const b=o.batteryBank;if(!b||!o.baseConnected)return null;
 const i=Array.from({length:o.upgrades.battery},(_,i)=>i).find(i=>!b.connected.includes(i));if(i===undefined)return null;
 const placed=b.placed.includes(i),checked=b.checked.includes(i),n=b.leads[i]?.length||0;
 return {id:'bank-'+i,target:'bank',title:!placed?'Place your extra battery':!checked?'Check the parallel battery branch':'Wire the extra battery in parallel',step:!placed?'Use the cyan cabinet footprint beside the field battery':!checked?'Use the inspection panel on the new cabinet':`${n}/2 leads · red + to +, black − to −`,detail:'Two matched 48 V packs in parallel stay at 48 V and add storage capacity. Each branch has a fuse, isolation contactors and battery management. The training check isolates the connectors and matches voltages before you fit the leads; precharge completes before the contactors close. Never join unmatched live batteries.'};
}
