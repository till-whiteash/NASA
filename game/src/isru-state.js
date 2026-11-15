import {habitatBuilt} from './habitat-build-state.js';
// Midgame construction uses a landed kit; each action is persisted in the mission.
export const ISRU_COMPLETE = 5;
export function isruUnlocked(o,c) {
  return habitatBuilt(o) && o.powerStep >= 6 && o.baseConnected && o.research?.relay >= 3 && !!c?.farmQuest?.rewarded;
}
const steps = [
 ['Survey the ISRU site','Inspect the marked ground for your resource-processing yard.'],
 ['Lay the ISRU foundation','Equip the builder and assemble the landed foundation kit at the site.'],
 ['Install the processing plant','Use the builder to install the oxygen plant, water tanks and pipe rack.'],
 ['Connect the ISRU power feed','Use the builder at the base power outlet to route a protected cable to the yard.'],
 ['Commission the ISRU plant','Return to the yard. Use the builder to test power, pressure and oxygen flow.']
];
export function isruObjective(o,c) {
  const step=o.isruStep||0;
  if(!isruUnlocked(o,c)||step>=ISRU_COMPLETE)return null;
  return {id:'isru-'+step,title:steps[step][0],detail:steps[step][1],target:step===3?'base':'isru'};
}
export function advanceISRU(o,c,tool) {
  const task=isruObjective(o,c);if(!task)return false;
  if((o.isruStep||0)>0&&tool!=='builder')return false;
  o.isruStep=(o.isruStep||0)+1;return true;
}
