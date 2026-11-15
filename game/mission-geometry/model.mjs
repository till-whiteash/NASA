export const C_KM_S = 299792.458;
export const AU_KM = 149597870.7;

export function validateDataset(data) {
  if (data?.schema_version !== 1 || data?.source !== 'NASA/JPL Horizons' || data?.conventions?.epoch_scale !== 'TDB') throw new Error('Unrecognised mission data.');
  if (data.conventions.au_km !== AU_KM || data.conventions.c_km_s !== C_KM_S) throw new Error('Unexpected units.');
  if (!Array.isArray(data.samples) || data.samples.length !== 25) throw new Error('Mission snapshots are incomplete.');
  let lastEpoch = -Infinity;
  for (const s of data.samples) {
    if (!/^\d{4}-\d{2}-01$/.test(s.date) || !Number.isFinite(s.jd_tdb) || s.jd_tdb <= lastEpoch) throw new Error('Invalid sample date/order.');
    lastEpoch = s.jd_tdb;
    if (![s.earth_au, s.mars_au].every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite))) throw new Error('Invalid planetary positions.');
    const km = Math.hypot(...s.earth_au.map((x,i) => x-s.mars_au[i])) * AU_KM;
    if (!(s.distance_km > 0) || !Number.isFinite(s.distance_km) || Math.abs(km-s.distance_km) > 0.01) throw new Error('Distance does not match positions.');
    if (!Number.isFinite(s.one_way_radio_seconds) || Math.abs(s.one_way_radio_seconds-km/C_KM_S) > 0.001) throw new Error('Radio time does not match distance.');
  }
  return data;
}

export function duration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Invalid duration');
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded/60)}m ${String(rounded%60).padStart(2,'0')}s`;
}

export function sampleExtremes(samples) {
  return {near: samples.reduce((a,s,i) => s.distance_km < samples[a].distance_km ? i : a, 0),
          far: samples.reduce((a,s,i) => s.distance_km > samples[a].distance_km ? i : a, 0)};
}
