import assert from 'node:assert/strict';
import {COURSES,trainingState,perform,answer,cleared} from '../game/src/training-state.js';
for(const dest of Object.keys(COURSES)){
 const s=trainingState(dest);assert.equal(cleared(s),false);assert.equal(perform(s,COURSES[dest].drills[0].actions[0]),false);s.briefed=true;
 for(const d of COURSES[dest].drills){
  assert.equal(answer(s,d.correct),false);assert.equal(perform(s,d.actions[2]),false);
  d.actions.forEach(a=>assert.equal(perform(s,a),true));
  assert.equal(answer(s,(d.correct+1)%3),false);assert.equal(cleared(s),false);assert.equal(answer(s,d.correct),true);
 }
 assert.equal(cleared(s),true);assert.equal(answer(s,0),false);assert.equal(perform(s,'anything'),false);
}
assert.throws(()=>trainingState('invalid'));console.log('PASS mission-specific training order, quiz gates, launch clearance, invalid course.');

const {LESSONS}=await import('../game/src/course-lessons.js');for(const [id,lessons] of Object.entries(LESSONS)){assert(COURSES[id]);assert(lessons.length>0);for(const l of lessons){assert(l.answers[l.correct]);assert(l.notes&&l.explanation&&l.slide&&l.page);}}console.log('PASS sourced lesson metadata and answer validity.');
