// Pre-positioned pod shells need commissioning before entry. Game-sized kit/time budgets.
export const COMMISSION_STEPS=[
 {name:'Assemble and seal the pod fittings',seconds:12,kits:1,air:0},
 {name:'Install dust filter and purge the cabin',seconds:12,kits:1,air:1},
 {name:'Pressure-test and verify breathable air',seconds:10,kits:1,air:1}
];
export const newCommission=()=>({step:0,kits:0,collected:false,remaining:0});
export const habitatReady=o=>!o.commission||o.commission.step>=COMMISSION_STEPS.length;
export function collectCommissionKit(o){const c=o.commission;if(!c||c.collected)return false;c.collected=true;c.kits=3;return true;}
export function beginCommission(o){
 const c=o.commission;if(habitatReady(o))return 'Habitat already commissioned.';
 if(!c.collected)return 'Collect the three commissioning kits inside your lander first.';
 if(c.remaining>0)return 'Work is in progress. Stay near the habitat entrance.';
 const step=COMMISSION_STEPS[c.step];
 if(c.kits<step.kits)return 'Missing commissioning kit.';
 if(o.o2<step.air)return 'Insufficient stored oxygen for this stage.';
 c.kits-=step.kits;o.o2-=step.air;c.remaining=step.seconds;return null;
}
export function tickCommission(dt,o,atDoor){
 const c=o.commission;if(!c||!(c.remaining>0)||!atDoor||!Number.isFinite(dt)||dt<=0)return false;
 c.remaining=Math.max(0,c.remaining-dt);if(c.remaining)return false;c.step++;return true;
}
export function commissionObjective(o){
 if(habitatReady(o))return null;const c=o.commission;
 return {id:'commission-'+c.step,title:c.collected?COMMISSION_STEPS[c.step].name:'Collect the habitat commissioning kits',detail:c.collected?`Use a habitat entrance to start work, then close the panel and stay within 6 m while it completes. ${c.remaining>0?Math.ceil(c.remaining)+' training seconds remain.':'Each stage consumes one landed kit; purge and pressure test each use 1 kg stored oxygen.'} Your suit air is limited: return to the ship if needed. Timings and gas amounts are game rules.`:'Enter your lander to collect seals, filters and pressure-test equipment. The pre-positioned habitat shells are not breathable yet. Your ship is the initial refuge.',target:c.collected?'commission-door':'commission-ship'};
}
