import assert from 'node:assert/strict';
import {moveOverSurface, ROVER_MOTION} from '../game/src/rover-terrain.js';
const ramp=(x,z)=>({height:Math.max(0,Math.min(8,z))*.5,normalY:1/Math.sqrt(1.25)});
for(const [start,travel] of [[-5,20],[15,-20]]){
 const p={x:0,z:start};assert.equal(moveOverSurface(p,0,travel,0,ramp),1);
 assert.ok(Math.abs(p.z-start-travel)<1e-8);
}
for(const surface of [
 (x,z)=>({height:z>=0?3:0,normalY:1}),
 (x,z)=>({height:Math.max(0,z)*2,normalY:1/Math.sqrt(5)})
]){
 const p={x:0,z:-5};assert.ok(moveOverSurface(p,0,20,0,surface)<1);
 assert.ok(p.z<0,'Stop before the front tyres tunnel into a wall or steep face');
}
assert.equal(ROVER_MOTION.max,16);assert.equal(ROVER_MOTION.accel,9);
console.log('Rover ramp ascent/descent, wall, steep face and high-speed sweep checks passed');

const small=(x,z)=>({height:Math.abs(z)<1?.6:0,normalY:.15,obstacleHeight:Math.abs(z)<1?.6:0});
const p={x:0,z:-5};assert.equal(moveOverSurface(p,0,12,0,small),1,'Small rocks must not trip the steep-face blocker');

// A steep sideways face must not block a gentler route along it.
const crossSlope=(x,z)=>({height:x*2+z*.4,normalY:1/Math.sqrt(5.16)});
const contour={x:0,z:-5};
assert.equal(moveOverSurface(contour,0,12,0,crossSlope),1);
// Starts, cruise, reverse and low frame rates agree on climbable hills.
for(const dt of [1/120,1/60,1/20]) {
 for(const direction of [-1,1]) {
  const hill=(x,z)=>({height:direction*z*Math.tan(50*Math.PI/180),normalY:Math.cos(50*Math.PI/180)});
  const q={x:0,z:0};
  for(let i=0;i<120;i++) assert.equal(moveOverSurface(q,0,direction*3*dt,0,hill),1);
  const steep=(x,z)=>({height:direction*z*2,normalY:1/Math.sqrt(5)});
  assert.ok(moveOverSurface({x:0,z:0},0,direction*.15*dt,0,steep)<1,'A slow start must not bypass a steep face');
 }
}
console.log('Cross-slope routes, 50-degree hills, reverse and frame-rate consistency passed');
