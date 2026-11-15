// Game storage rules. Old aggregate ore counts remain the save format.
export const TOOL_SLOTS=6, SAMPLE_SLOTS=24, STACK_SIZE=64;
export const SAMPLE_KEYS=['hematite','gypsum','iron','silica','carbonate'];
export const quantity=n=>Number.isFinite(n)&&n>0?Math.floor(n):0;
export const usedSlots=bag=>SAMPLE_KEYS.reduce((n,k)=>n+Math.ceil(quantity(bag?.[k])/STACK_SIZE),0);
export function sampleRoom(bag,key){
 if(!SAMPLE_KEYS.includes(key))return 0;
 const n=quantity(bag?.[key]),partial=n%STACK_SIZE;
 return Math.max(0,SAMPLE_SLOTS-usedSlots(bag))*STACK_SIZE+(partial?STACK_SIZE-partial:0);
}
export function sampleStacks(counts){
 return SAMPLE_KEYS.flatMap(key=>{
  const count=quantity(counts?.[key]),rows=[];
  for(let n=0;n<count;n+=STACK_SIZE)rows.push({id:`${key}:${n/STACK_SIZE}`,key,count:Math.min(STACK_SIZE,count-n),kind:'sample'});
  return rows;
 });
}
export function transferSamples(state,key,toBase,requested=STACK_SIZE){
 if(!SAMPLE_KEYS.includes(key)||!Number.isFinite(requested)||requested<=0)return 0;
 state.bag??={};state.store??={};
 const from=toBase?state.bag:state.store,to=toBase?state.store:state.bag;
 const amount=Math.min(quantity(from[key]),Math.floor(requested),toBase?Infinity:sampleRoom(state.bag,key));
 if(amount<=0)return 0;
 from[key]-=amount;to[key]=quantity(to[key])+amount;return amount;
}
export function transferTool(state,tool,toBase){
 const from=toBase?state.belt:state.locker,to=toBase?state.locker:state.belt;
 const index=from.indexOf(tool);
 if(index<0||to.includes(tool)||(!toBase&&to.length>=TOOL_SLOTS))return false;
 const held=state.belt[state.held];
 from.splice(index,1);to.push(tool);
 state.held=toBase?(held===tool?-1:state.belt.indexOf(held)):state.belt.indexOf(tool);
 return true;
}
