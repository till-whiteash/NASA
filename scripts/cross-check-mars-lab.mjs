// Local-only science cross-check. Never serializes the NASA credential or a
// credential-bearing URL. Does not overwrite production game data.
import {readFileSync,writeFileSync} from 'node:fs';
let key=process.env.NASA_API_KEY;
try{key ||= readFileSync(new URL('../.env',import.meta.url),'utf8').match(/^\s*NASA_API_KEY\s*=\s*["']?([^\s"'#]+)/m)?.[1];}catch{}
const requestedDate='2026-11-06';
const out={requestedDate,checkedUTC:new Date().toISOString(),checks:{},references:{
  marsFacts:'https://science.nasa.gov/mars/facts/',
  sky:'https://science.nasa.gov/solar-system/planets/mars/what-does-a-sunrise-sunset-look-like-on-mars/',
  terrain:'https://science.nasa.gov/3d-resources/mars-spirit-landing-site/',
  surface:'https://nssdc.gsfc.nasa.gov/planetary/mars/mars_exploration_rovers/mera_images.html',
  atmosphere:'https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts/mars-at-a-glance/',
}};
async function check(name,run){try{out.checks[name]=await run();console.log(name+': checked');}catch{out.checks[name]={status:'unavailable'};console.log(name+': unavailable (no credentials logged)');}}
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('Unavailable');return r.json();}
await Promise.all([
  check('authenticatedEPIC',async()=>{
    if(!key)return {status:'no-key-configured'};
    const list=await json(`https://api.nasa.gov/EPIC/api/natural?api_key=${encodeURIComponent(key)}`);
    if(!Array.isArray(list)||!list[0]?.date)throw new Error('No EPIC record');
    return {status:'ok',privateKeyUsed:true,service:'NASA EPIC',latestPhotoDate:list[0].date,note:'Confirms authenticated NASA access and the Earth reference only. Mars surface conclusions use the Mars-specific sources below.'};
  }),
  check('authenticatedNASA',async()=>{
    if(!key) return {status:'no-key-configured'};
    const flares=await json(`https://api.nasa.gov/DONKI/FLR?startDate=2026-10-30&endDate=${requestedDate}&api_key=${encodeURIComponent(key)}`);
    if(!Array.isArray(flares))throw new Error('Unexpected response');
    return {status:'ok',service:'NASA DONKI',privateKeyUsed:true,window:['2026-10-30',requestedDate],flareCount:flares.length,classes:[...new Set(flares.map(f=>f.classType).filter(Boolean))],note:'Solar-event catalogue, not a measurement of radiation dose at this Mars base. No direct storm-dose inference is made.'};
  }),
  check('marsWeather',async()=>{
    const feed=await json('https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json');
    const w=feed.soles?.find(s=>s.max_temp!=='--'&&s.min_temp!=='--'&&s.pressure!=='--');
    if(!w)throw new Error('No measurement');
    return {status:'ok',source:'NASA Curiosity REMS / Gale Crater',measurementDate:w.terrestrial_date,sol:Number(w.sol),lowC:Number(w.min_temp),highC:Number(w.max_temp),pressurePa:Number(w.pressure),note:'Latest available feed record; Gale Crater measurement, not live Gusev weather or a 2126 forecast.'};
  }),
  check('earthMarsDistance',async()=>{
    const q=new URLSearchParams({format:'json',COMMAND:"'499'",CENTER:"'500@399'",EPHEM_TYPE:"'OBSERVER'",START_TIME:"'2026-11-06'",STOP_TIME:"'2026-11-07'",STEP_SIZE:"'1d'",QUANTITIES:"'20'"});
    const hz=await json('https://ssd.jpl.nasa.gov/api/horizons.api?'+q);
    const row=hz.result?.split('$$SOE')[1]?.split('$$EOE')[0]?.trim().split('\n')[0];
    const au=parseFloat(row?.trim().split(/\s+/).slice(-2)[0]);
    if(!Number.isFinite(au))throw new Error('No ephemeris');
    const km=Math.round(au*149597870.7);
    return {status:'ok',source:'NASA JPL Horizons',date:requestedDate,km,lightMinutes:Number((km/299792.458/60).toFixed(1)),note:'Actual ephemeris for this date. Not the game’s fictional 2126 mission distance.'};
  }),
  check('surfaceImagery',async()=>{
    const results=await json('https://images-api.nasa.gov/search?q=Spirit%20Gusev%20panorama&media_type=image&page_size=5');
    return {status:'ok',source:'NASA Image and Video Library (public, no key required)',items:(results.collection?.items||[]).map(i=>({title:i.data?.[0]?.title,nasaId:i.data?.[0]?.nasa_id,preview:i.links?.find(l=>l.rel==='preview')?.href})).slice(0,3)};
  }),
]);
out.design={basis:'Gusev-inspired dry basaltic plain using the existing NASA Spirit-derived heightmap. Distances and relief remain compressed/stretched for play.',fictional:['2126 habitat layout','survey-station positions','subsurface survey results are not predetermined','display fitting of imported building dimensions'],recommendations:['Keep dusty rusty-brown daylight and blue near-Sun sunset; no Earth-blue daytime sky.','Keep mineral exploration, crater/rubble landmarks and empty travel space; avoid exposed lakes, lawns or decorative blue ice at this near-equatorial site.','Use lit materials, opaque pressure modules and shielding concepts; greenhouse crops stay inside.','Fit colliders and airlock interactions to the imported modules before production use.','Keep solar event data separate from simulated local radiation dose.']};
const output=JSON.stringify(out,null,2)+'\n';
if(key&&output.includes(key))throw new Error('Credential serialization blocked');
writeFileSync(new URL('../game/internal/unity-model-lab/science-check.json',import.meta.url),output);
console.log('Saved internal key-free Mars science cross-check.');
