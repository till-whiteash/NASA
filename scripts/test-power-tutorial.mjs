// Starter power tutorial rules: print before assembling, circuit training before the first assembly, old saves keep
// their progress, feedstock and recycling, and one battery + one solar array power at most one base.
import assert from 'node:assert/strict';
import { powerLearn, missingPrints, canPrint, printPart, recycleSample, labDone, completeLab, powerLearnObjective, powerSets, canPowerAnotherBase, powerCapacityNote, START_FEED } from '../game/src/power-tutorial-state.js';

const o = { powerStep: 1, panels: 0, upgrades: { battery: 0 } };
assert.equal(powerLearn(o).feed, START_FEED);
assert.deepEqual(missingPrints(o, 'array'), ['Support frame', 'Output connector']);       // the solar module comes from Earth
assert.equal(canPrint(o, 'Solar module').ok, false);
let task = powerLearnObjective(o); assert.equal(task.target, 'fabricator'); assert.match(task.detail, /Support frame/);
for (const p of ['Support frame', 'Output connector', 'Battery module', 'Protected output']) assert.equal(printPart(o, p).ok, true);
assert.equal(printPart(o, 'Support frame').ok, false);                                    // no double printing
assert.equal(powerLearn(o).feed, START_FEED - 10);
task = powerLearnObjective(o); assert.equal(task.id, 'lab-series'); assert.equal(task.target, 'workbench');
completeLab(o, 'series'); assert.equal(powerLearnObjective(o).id, 'lab-parallel');
completeLab(o, 'parallel'); completeLab(o, 'ground'); assert.ok(labDone(o)); assert.equal(powerLearnObjective(o), null);
o.powerStep = 3; assert.equal(powerLearnObjective(o), null);                               // battery parts were printed up front

const poor = { powerStep: 1 }; powerLearn(poor).feed = 1;
assert.match(canPrint(poor, 'Support frame').why, /feedstock/);
const store = { hematite: 0, silica: 2 }; assert.equal(recycleSample(poor, store), 'silica'); assert.equal(store.silica, 1); assert.equal(powerLearn(poor).feed, 4);
assert.equal(recycleSample(poor, { hematite: 0 }), null);

const veteran = { powerStep: 6 }; assert.ok(labDone(veteran)); assert.deepEqual(missingPrints(veteran, 'battery'), []);   // old saves keep working power

// one battery + one array (3 panels) per base
const p = { panels: 3, upgrades: { battery: 0 } }, c = { greenhouses: [] };
assert.equal(powerSets(p), 1); assert.equal(canPowerAnotherBase(p, c), false);
assert.match(powerCapacityNote(p, c), /Extra battery and add 3 more solar panels/);
p.upgrades.battery = 1; assert.equal(canPowerAnotherBase(p, c), false); assert.match(powerCapacityNote(p, c), /add 3 more/);
p.panels = 6; assert.equal(canPowerAnotherBase(p, c), true);
c.greenhouses.push({}); assert.equal(canPowerAnotherBase(p, c), false);
console.log('Printing, circuit training gates, old saves, feedstock and one-battery-one-array-per-base rules passed.');
