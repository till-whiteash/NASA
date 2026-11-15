import assert from 'node:assert/strict';
import {marsObjective} from '../game/src/mars-objectives.js';
import {advanceISRU,isruObjective} from '../game/src/isru-state.js';
import {renderRatio} from '../game/src/render-health.js';
const o={habBuild:null,powerStep:6,baseConnected:true,research:{relay:3},upgrades:{regolith:0},chargerStep:0},c={farmQuest:{rewarded:true}};
assert.equal(marsObjective(o,c).id,'isru-0');
assert.equal(isruObjective({...o,baseConnected:false},c),null);
assert.equal(isruObjective(o,{farmQuest:{}}),null);
assert(advanceISRU(o,c,null));assert.equal(o.isruStep,1);
assert.equal(advanceISRU(o,c,'pickaxe'),false);
for(let i=1;i<5;i++){assert.equal(marsObjective(o,c).id,'isru-'+i);assert(advanceISRU(o,c,'builder'));}
assert.equal(isruObjective(o,c),null);assert.equal(marsObjective(o,c).id,'charger-0');
assert.equal(advanceISRU(o,c,'builder'),false);
for(const q of ['low','balanced','high'])for(const [w,h] of [[390,844],[1920,1080],[3840,2160]]){
 const ratio=renderRatio(w,h,2,q),budget=q==='low'?1280*720:q==='high'?2560*1440:1920*1080;
 assert(w*h*ratio*ratio<=budget+1);assert(ratio>0&&Number.isFinite(ratio));
}
console.log('ISRU progression, prerequisites, tool gate and graphics pixel budgets passed.');

const {Outpost}=await import('../game/src/sim.js');
const {readFileSync}=await import('node:fs');
const facts=JSON.parse(readFileSync(new URL('../game/data/mars-facts.json',import.meta.url))).facts;
const sim=new Outpost('normal',facts,'gusev');sim.powerStep=6;sim.baseConnected=true;sim.upgrades.moxie=1;
const baseOxygen=sim.forecast().o2;sim.isruStep=5;
assert(Math.abs(sim.forecast().o2-baseOxygen*1.3)<1e-9);
sim.baseConnected=false;const disconnected=sim.forecast().o2;sim.isruStep=0;assert.equal(sim.forecast().o2,disconnected);
assert.equal(isruObjective({...o,habBuild:{step:0}},c),null);
console.log('Commissioned oxygen bonus and habitat prerequisite passed.');
