// Fictional campaign. Durations and costs are training rules, not NASA measurements.
export const JOBS = {
  telemetry: {name:'Recover rover telemetry', crew:'Mateo', seconds:30, parts:1, evidence:'A dust-obscured navigation camera triggered a safe stop. The rover was not taken by aliens.'},
  biology: {name:'Compare sealed samples and controls', crew:'Mei Lin', seconds:45, parts:1, evidence:'Fictional result: the sealed sample differs from the sterile blank. This is a story clue, not proof of real Martian life.'},
  impact: {name:'Survey the outpost footprint', crew:'Freya', seconds:40, parts:1, evidence:'Fictional result: the colony is declining near warm exhaust and disturbed ground. Human activity may be damaging its habitat.'}
};
export const ENDINGS={
  preserve:{name:'Protect the site',text:'Expansion pauses around the discovery. Remote instruments monitor it while the crew keeps the existing outpost running.',expansion:false},
  withdraw:{name:'Recommend withdrawal',text:'The crew submits a withdrawal plan and leaves the samples sealed on Mars. Continue the sandbox as a training replay; no return flight is simulated.',expansion:false},
  develop:{name:'Continue development',text:'The mission authorizes a fictional development plan. Local habitat is lost and the lost scientific record cannot be recovered. The decision is recorded, not presented as a scientific recommendation.',expansion:true}
};
export function storyState(o){return o.story??={version:1,started:false,evidence:[],job:null,ending:null};}
export function startJob(o,id){
  const s=storyState(o),j=JOBS[id];
  if(!j)return 'Unknown assignment.';
  if(s.ending)return 'The investigation is complete.';
  if(!o.baseConnected||!o.roverCharged)return 'Commission base power and charge the rover first.';
  if(s.job)return 'One crew assignment is already running.';
  if(s.evidence.includes(id))return 'This evidence is already recorded.';
  const order=Object.keys(JOBS),prior=order.slice(0,order.indexOf(id));
  if(prior.some(k=>!s.evidence.includes(k)))return 'Complete the preceding investigation first.';
  if(!(o.parts>=j.parts))return 'Salvage one metal part for this assignment.';
  o.parts-=j.parts;s.started=true;s.job={id,remaining:j.seconds};return null;
}
export function tickStory(dt,o){
  const s=o.story;
  if(!s?.job||!o.baseConnected||!(o.today?.total*o.split?.life>=1)||!Number.isFinite(dt)||dt<=0)return false;
  s.job.remaining=Math.max(0,s.job.remaining-dt);
  if(s.job.remaining>0)return false;
  if(!s.evidence.includes(s.job.id))s.evidence.push(s.job.id);
  s.job=null;return true;
}
export function chooseEnding(o,id){
  const s=storyState(o);
  if(!ENDINGS[id]||s.ending||Object.keys(JOBS).some(k=>!s.evidence.includes(k)))return false;
  s.ending=id;return true;
}
