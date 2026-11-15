// Habitat building quest: a new game starts with an empty site; old saves keep their finished habitat.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Outpost} from '../game/src/sim.js';
import {marsObjective,missionLog} from '../game/src/mars-objectives.js';
import {HAB_DONE,habitatBuilt,habBuildObjective,habBuildLog,newHabBuild} from '../game/src/habitat-build-state.js';
const facts=JSON.parse(readFileSync(new URL('../game/data/mars-facts.json',import.meta.url))).facts;
const o=new Outpost('normal',facts),c={farmQuest:{rewarded:false}};
assert.deepEqual(o.habBuild,newHabBuild());assert.equal(habitatBuilt(o),false);
const ids=[];for(let i=0;i<HAB_DONE;i++){o.habBuild.step=i;const t=marsObjective(o,c);ids.push(t.id);assert.equal(t.target,'hab');assert.ok(t.title&&t.detail&&t.step);}
assert.deepEqual(ids,['hab-0','hab-1','hab-2','hab-3','hab-4','hab-5']);
o.habBuild.step=1;o.habBuild.cleared=[0,2];assert.match(habBuildObjective(o).step,/2\/4 rocks/);
o.habBuild.step=2;o.habBuild.frames=[0,1,2];o.habBuild.modules=6;assert.match(marsObjective(o,c).step,/3\/6 modules/);
o.habBuild.step=5;o.habBuild.pressure=4;assert.match(habBuildObjective(o).step,/Pressurising 50%/);
assert.equal(habBuildLog(o).filter(t=>t.done).length,5);
o.habBuild.step=HAB_DONE;assert.ok(habitatBuilt(o));assert.equal(habBuildObjective(o),null);assert.equal(marsObjective(o,c).id,'safety-reserves');
assert.ok(missionLog(o,c).slice(0,6).every(t=>t.done));
// saves made before habitat building: main.js loads them with habBuild null -> finished base, no habitat tasks
const legacy=JSON.parse(JSON.stringify(o));legacy.habBuild=null;
assert.ok(habitatBuilt(legacy));assert.equal(habBuildLog(legacy).length,0);assert.notEqual(marsObjective(legacy,c).id.slice(0,4),'hab-');
// a save made mid-build restores the same step
const mid=new Outpost('normal',facts);Object.assign(mid,JSON.parse(JSON.stringify({...o,habBuild:{...newHabBuild(),step:3,frames:[0,1,2,3,4,5]}})));
assert.equal(marsObjective(mid,c).id,'hab-3');
console.log('Habitat building quest: steps, progress text, completion gate and save compatibility passed.');
