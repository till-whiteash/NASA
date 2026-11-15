import assert from 'node:assert/strict';
import {newCommission,habitatReady,collectCommissionKit,beginCommission,tickCommission,commissionObjective} from '../game/src/habitat-commission.js';
assert.equal(habitatReady({}),true); // legacy save
const o={o2:22,commission:newCommission()};
assert.equal(commissionObjective(o).target,'commission-ship');
assert.ok(beginCommission(o));assert.equal(collectCommissionKit(o),true);assert.equal(collectCommissionKit(o),false);
assert.equal(beginCommission(o),null);assert.equal(o.commission.kits,2);
assert.ok(beginCommission(o));tickCommission(90,o,false);assert.equal(o.commission.remaining,12);
tickCommission(6,o,true);const loaded=JSON.parse(JSON.stringify(o));tickCommission(6,loaded,true);
assert.equal(loaded.commission.step,1);assert.equal(habitatReady(loaded),false);
for(let i=0;i<2;i++){assert.equal(beginCommission(loaded),null);tickCommission(12,loaded,true);}
assert.equal(habitatReady(loaded),true);assert.equal(loaded.o2,20);assert.equal(loaded.commission.kits,0);
assert.equal(commissionObjective(loaded),null);
console.log('Habitat lock, finite kits/oxygen, proximity, save/resume and legacy compatibility pass.');
