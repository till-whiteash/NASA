import assert from 'node:assert/strict';
import {storyState,startJob,tickStory,chooseEnding} from '../game/src/story-state.js';
const o={parts:5,baseConnected:false,roverCharged:false,today:{total:4},split:{life:.5}};
assert.ok(startJob(o,'telemetry'));assert.equal(o.parts,5);
o.baseConnected=true;o.roverCharged=true;
assert.ok(startJob(o,'biology'));assert.equal(startJob(o,'telemetry'),null);
assert.equal(o.parts,4);assert.ok(startJob(o,'telemetry'));
o.baseConnected=false;tickStory(90,o);assert.equal(o.story.job.remaining,30);
o.baseConnected=true;o.split.life=0;tickStory(90,o);assert.equal(o.story.job.remaining,30);
o.split.life=.5;tickStory(15,o);const loaded=JSON.parse(JSON.stringify(o));
assert.equal(loaded.story.job.remaining,15);assert.equal(tickStory(15,loaded),true);
assert.equal(chooseEnding(loaded,'preserve'),false);
for(const id of ['biology','impact']){assert.equal(startJob(loaded,id),null);tickStory(60,loaded);}
assert.equal(chooseEnding(loaded,'preserve'),true);assert.equal(chooseEnding(loaded,'develop'),false);
assert.ok(startJob(loaded,'telemetry'));assert.equal(loaded.parts,2);
assert.deepEqual(storyState({}).evidence,[]);
console.log('Campaign gating, costs, power pauses, save/resume and immutable endings pass.');
