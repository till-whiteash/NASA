import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Outpost} from '../game/src/sim.js';
import {marsObjective,missionLog} from '../game/src/mars-objectives.js';
import {printPart,completeLab} from '../game/src/power-tutorial-state.js';
const facts=JSON.parse(readFileSync(new URL('../game/data/mars-facts.json',import.meta.url))).facts;
const o=new Outpost('normal',facts),c={farmQuest:{rewarded:false}};
// A new crew builds its habitat first (habitat-build-state.js), then the safety checks begin.
for(let i=0;i<6;i++){o.habBuild.step=i;assert.equal(marsObjective(o,c).id,'hab-'+i);}
o.habBuild.step=6;
assert.equal(marsObjective(o,c).id,'safety-reserves');
o.safetyChecks.reserves=true;assert.equal(marsObjective(o,c).id,'safety-shelter');
o.safetyChecks.shelter=true;
assert.equal(o.panels,0);assert.equal(o.solar(),0);
for(let i=0;i<6;i++){o.powerStep=i;
 if(i===1){   // the learning steps before the first assembly: print the parts, then circuit training (power-tutorial-state.js)
  assert.equal(marsObjective(o,c).id,'print-array');
  for(const p of ['Support frame','Output connector','Battery module','Protected output'])printPart(o,p);
  for(const s of ['series','parallel','ground']){assert.equal(marsObjective(o,c).id,'lab-'+s);completeLab(o,s);}
 }
 assert.equal(marsObjective(o,c).id,'power-'+i);assert.equal(o.solar(),0);}
o.panels=3;o.powerStep=6;assert.equal(o.solar(),0);assert.equal(marsObjective(o,c).id,'base');
o.baseConnected=true;assert.ok(o.solar()>0);
assert.equal(marsObjective(o,c).id,'relay');o.research={relay:3,harvests:0};
assert.equal(marsObjective(o,c).id,'harvest');c.farmQuest.rewarded=true;
for(let i=0;i<3;i++){o.chargerStep=i;assert.equal(marsObjective(o,c).id,'charger-'+i);}
o.chargerStep=3;assert.equal(marsObjective(o,c).id,'charge');
assert.ok(o.chargerAllocation()>0);assert.equal(o.forecast().total+o.chargerAllocation(),o.energy());
o.roverCharged=true;
for(let i=0;i<4;i++){o.soilStep=i;assert.equal(marsObjective(o,c).id,'soil-'+i);}
o.upgrades.regolith=1;
assert.equal(marsObjective(o,c).id,'culture');o.research.harvests=1;
assert.equal(marsObjective(o,c).id,'explore');assert.ok(missionLog(o,c).every(t=>t.done));
const restored=new Outpost('normal',facts);Object.assign(restored,JSON.parse(JSON.stringify(o)));
assert.equal(marsObjective(restored,c).id,'explore');assert.equal(restored.solar(),o.solar());
console.log('Mars commissioning gates, objectives, charging energy budget, shielding and save state passed.');

// Pre-safety saves have no safetyChecks field and must not restart the tutorial.
const legacy=JSON.parse(JSON.stringify(o));delete legacy.safetyChecks;
assert.equal(marsObjective(legacy,c).id,'explore');
assert.ok(missionLog(legacy,c).every(t=>t.done));
const partial=new Outpost('normal',facts);partial.habBuild.step=6;partial.safetyChecks.reserves=true;
const loaded=JSON.parse(JSON.stringify(partial));
assert.equal(marsObjective(loaded,c).id,'safety-shelter');
console.log('Legacy saves and partially completed safety checks retain their progression.');
