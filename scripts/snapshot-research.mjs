// Public, keyless endpoints. Run from any working directory. Never ship .env files.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
const root=new URL('../game/data/',import.meta.url);
const file=new URL('research-resources.json',root);
const catalogue=JSON.parse(await readFile(file,'utf8'));
const rawDir=new URL('research/',root);await mkdir(rawDir,{recursive:true});
const records=d=>Array.isArray(d)?d:Array.isArray(d?.columns)&&Array.isArray(d?.data)?d.data.map(row=>Object.fromEntries(d.columns.map((k,i)=>[k,row[i]]))):[];
const queries=[
 {id:'donki',name:'NASA DONKI flare history',period:'10–11 May 2024',url:'https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2024-05-10&endDate=2024-05-11',valid:d=>Array.isArray(d)&&d.every(v=>v.flrID&&v.beginTime),summary:d=>`${d.length} flare records. Historical solar observations; no Mars arrival prediction.`},
 {id:'osdr',name:'OSDR OSD-37 study metadata',period:'BRIC-19 spaceflight plant study',url:'https://osdr.nasa.gov/osdr/data/osd/meta/37',valid:d=>!!d.study?.['OSD-37'],summary:()=> 'Study metadata for an Arabidopsis spaceflight comparison. No alien biology or game crop yields inferred.'},
 {id:'radlab',name:'RadLab instrument comparison',period:'1 April 2022, 23:00–23:10 UTC',url:'https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp%3E=2022-04-01T23%3A00&timestamp%3C2022-04-01T23%3A10&absorbed_dose_rate&format=json',valid:d=>Array.isArray(d)&&d.length>0&&d.every(v=>v.instrument_id&&v.timestamp&&Number.isFinite(Number(v.absorbed_dose_rate))),summary:d=>`${d.length} instrument readings; absorbed dose rate in microgray/hour. ISS readings are not Mars surface dose or dose equivalent.`}
];
catalogue.snapshots=await Promise.all(queries.map(async q=>{
 const previous=catalogue.snapshots?.find(s=>s.id===q.id&&s.status==='Downloaded snapshot');
 try{
  const r=await fetch(q.url,{signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error('HTTP '+r.status);
  const raw=await r.json(),d=q.id==='radlab'?records(raw):raw;if(!q.valid(d))throw Error('Unexpected or empty response schema');
  const target=new URL(q.id+'.json',rawDir),tmp=new URL(q.id+'.tmp',rawDir);
  await writeFile(tmp,JSON.stringify({source:q.url,fetched:new Date().toISOString(),data:d},null,2));await rename(tmp,target);
  return {id:q.id,name:q.name,status:'Downloaded snapshot',fetched:new Date().toISOString(),period:q.period,summary:q.summary(d),examples:q.id==='donki'?d.slice(0,3).map(v=>`${v.classType} flare  /  ${v.peakTime||v.beginTime}`):q.id==='radlab'?d.slice(0,3).map(v=>`${v.instrument_id}  /  ${v.timestamp} UTC  /  ${Number(v.absorbed_dose_rate).toFixed(3)} microgray/hour`):['OSD-37  /  Arabidopsis thaliana  /  spaceflight versus ground controls'],source:q.url,file:'data/research/'+q.id+'.json'};
 }catch(e){
  console.warn(q.id+': '+e.message);
  if(previous)return {...previous,lastAttempt:new Date().toISOString(),refreshError:e.message};
  return {id:q.id,name:q.name,status:'Unavailable',period:q.period,summary:'No observation values substituted. '+e.message,source:q.url};
 }
}));
const tmp=new URL('research-resources.tmp',root);await writeFile(tmp,JSON.stringify(catalogue,null,2));await rename(tmp,file);
console.log(catalogue.snapshots.map(s=>s.name+': '+s.status).join('\n'));
