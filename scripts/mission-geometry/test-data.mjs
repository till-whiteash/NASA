import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateDataset, duration, sampleExtremes, C_KM_S, AU_KM} from '../../game/mission-geometry/model.mjs';

const data=JSON.parse(readFileSync(new URL('../../game/mission-geometry/earth-mars.json',import.meta.url),'utf8'));
validateDataset(data);
assert.equal(data.samples[0].date,'2026-01-01');
assert.equal(data.samples.at(-1).date,'2028-01-01');
for (const source of data.sources) {
  const raw=readFileSync(new URL(`./evidence/horizons-${source.body}.json`,import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'),source.response_sha256,'raw source hash changed');
  const cached=JSON.parse(raw);
  assert.equal(cached.parameters.VEC_CORR,"'NONE'");
  assert.equal(cached.parameters.TIME_TYPE,"'TDB'");
  assert.equal(cached.parameters.CENTER,"'500@10'");
  const rows=cached.response.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line=>line.split(',').map(v=>v.trim()));
  rows.forEach((row,i)=>{
    assert.equal(Number(row[0]),data.samples[i].jd_tdb);
    assert.deepEqual(row.slice(2,5).map(Number),data.samples[i][source.body+'_au']);
  });
}
assert.equal(duration(59.6),'1m 00s');
assert.equal(duration(0),'0m 00s');
assert.throws(()=>duration(NaN));
assert.throws(()=>duration(-1));
const extremes=sampleExtremes(data.samples);
assert.ok(data.samples[extremes.near].distance_km < data.samples[extremes.far].distance_km);
const corrupt=structuredClone(data);
corrupt.samples[0].mars_au[2]+=1;
assert.throws(()=>validateDataset(corrupt),/Distance/,'z component must affect distance');
const wrongDelay=structuredClone(data);
wrongDelay.samples[0].one_way_radio_seconds/=1000;
assert.throws(()=>validateDataset(wrongDelay),/Radio/,'metres/kilometres mismatch must fail');
const badUnits=structuredClone(data);
badUnits.conventions.c_km_s*=1000;
assert.throws(()=>validateDataset(badUnits),/units/);
const badDate=structuredClone(data);
badDate.samples[1].jd_tdb=badDate.samples[0].jd_tdb;
assert.throws(()=>validateDataset(badDate),/date/);
const report=JSON.parse(readFileSync(new URL('../../game/mission-geometry/siderust-validation.json',import.meta.url),'utf8'));
assert.equal(report.samples.length,data.samples.length);
assert.equal(report.siderust_version,'0.9.1');
for(const [i,s] of report.samples.entries()){
  assert.equal(s.nasa_distance_km,data.samples[i].distance_km);
  assert.equal(s.jd_input,data.samples[i].jd_tdb);
  assert.ok(s.absolute_difference_km <= report.acceptance_km);
}
console.log(`PASS: ${data.samples.length} NASA snapshots, source hashes, 3D units, time order, radio rounding and Siderust comparison (${report.max_absolute_difference_km.toFixed(3)} km maximum).`);
