// Checks the radiation exposure bar (game/src/exposure.js). Run: node scripts/test-exposure.mjs
import assert from 'node:assert/strict';
import { Exposure, EXPOSURE } from '../game/src/exposure.js';

const run = (e, sols, opts, steps = 100) => {
  const events = []; let dose = 0;
  for (let i = 0; i < steps; i++) { const r = e.update(sols / steps, opts); dose += r.extraDose; if (r.event) events.push(r.event); }
  return { events, dose };
};
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);

// quiet day on foot: fills at footPerSol, no damage inside the grace sol
let e = new Exposure();
let r = run(e, 0.5, { outside: true, driving: false, storm: null });
near(e.level, EXPOSURE.footPerSol * 0.5); assert.equal(r.dose, 0); assert.equal(e.damaging, false);

// the rover blocks part of it
e = new Exposure(); run(e, 0.9, { outside: true, driving: true, storm: null });
near(e.level, EXPOSURE.footPerSol * EXPOSURE.roverShield * 0.9);

// a solar storm fills it faster
const storm = { strength: 2 };
e = new Exposure(); run(e, 0.25, { outside: true, driving: false, storm });
near(e.level, EXPOSURE.footPerSol * Exposure.stormFactor(storm) * 0.25);
assert.ok(Exposure.stormFactor(storm) > 1 && Exposure.stormFactor(null) === 1);

// more than a sol outside: damage starts, once, with extra badge dose
e = new Exposure(); r = run(e, 1.5, { outside: true, driving: true, storm: null }, 150);
assert.equal(e.damaging, true); assert.deepEqual(r.events, ['damage']); assert.ok(r.dose > 0);

// going inside resets the trip clock and the bar recovers
run(e, 0.1, { outside: false });
assert.equal(e.outsideSols, 0); assert.equal(e.damaging, false);
const before = e.level; run(e, 0.2, { outside: false }); assert.ok(e.level < before);

// filling it completely: radiation sickness, a dose penalty, slower movement for a while
e = new Exposure(); r = run(e, 3, { outside: true, driving: false, storm: { strength: 3 } }, 300);
assert.ok(r.events.includes('high') && r.events.includes('sick'));
assert.ok(r.dose >= EXPOSURE.sickDose);
assert.ok(e.sick || r.events.lastIndexOf('sick') >= 0);
e = new Exposure({ level: 0.5, outsideSols: 0, sickSols: EXPOSURE.sickSols });
run(e, EXPOSURE.sickSols + 0.01, { outside: false }); assert.equal(e.sick, false);

// saves and loads
const saved = JSON.parse(JSON.stringify(new Exposure({ level: 0.42, outsideSols: 0.7, sickSols: 0.1 }).save()));
const back = new Exposure(saved); near(back.level, 0.42); near(back.outsideSols, 0.7); near(back.sickSols, 0.1);

console.log('exposure: all checks passed');
