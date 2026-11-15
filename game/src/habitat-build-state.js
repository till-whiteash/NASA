// Pure quest state for building the habitat from nothing (no graphics: tested by scripts/test-habitat-build.mjs).
// Build the habitat from nothing: a new crew lands next to an empty site and the quest walks them through it.
//   0 walk to the site · 1 clear four rocks with the pickaxe · 2 lay a foundation and raise a frame for every module
//   3 fit the inflatable pressure shells · 4 attach the airlocks and stairs · 5 seal and pressurise the cabin
// Until the habitat is pressurised the lander is the crew's shelter. Saves made before this feature have no
// `habBuild` and keep their finished base. Steps, timings and amounts are simplified game rules.

import {newPioneer,pioneerObjective,pioneerLog,stockText} from './pioneer-state.js';

export const HAB_DONE = 6, ROCKS = 4, PRESSURE_SECONDS = 8;
export const newHabBuild = () => ({ step: 0, cleared: [], rockHits: {}, frames: [], pressure: 0, pioneer: newPioneer() });
export const habitatBuilt = o => !o?.habBuild || o.habBuild.step >= HAB_DONE;

// Quest text for the current step (null once the habitat is finished). `modules` = number of habitat modules.
export function habBuildObjective(o, modules = 6) {
  if (habitatBuilt(o)) return null;
  const prep=pioneerObjective(o.habBuild);if(prep)return prep;
  const b = o.habBuild, base = { target: 'hab' };
  switch (b.step) {
    case 0: return { ...base, id: 'hab-0', title: 'Walk to the habitat site', step: 'Follow the marker to the flat ground beside your lander',
      detail: 'Nothing is built yet: your lander is your shelter for now, and your suit air is limited. Follow the quest marker to the site where your habitat will stand.' };
    case 1: return { ...base, id: 'hab-1', title: 'Clear the building site', step: `${b.cleared.length}/${ROCKS} rocks cleared · equip the pickaxe`,
      detail: 'Equip the pickaxe (1–6 / tap its slot). Aim at each marked rock and left click / tap Mine three times. E / Inspect examines the rock without damage. Let each pickaxe swing finish. Modules need clear, level ground.' };
    case 2: return { ...base, id: 'hab-2', title: 'Lay foundations and raise the frames', step: `Choose a glowing footprint · ${b.frames.length}/${modules} modules framed`,
      detail: 'Walk to each glowing footprint and press E / Action. Each frame uses 2 recovered alloy units and 1 membrane pack. Footings spread the weight; the frame supports the shell. Choose the module order yourself. The engineered footprints keep doors and pressure tunnels aligned.' };
    case 3: return { ...base, id: 'hab-3', title: 'Fit the pressure shells', step: 'Use the yellow control post at the front of the site',
      detail: 'The shells travel folded and expand over the frames, like NASA\'s BEAM expandable module tested on the International Space Station from 2016.' };
    case 4: return { ...base, id: 'hab-4', title: 'Attach the airlocks and stairs', step: 'Use the airlock marker at the first module',
      detail: 'An airlock lets you go in and out without losing the cabin air. Aim at the glowing airlock outline and press E / Action.' };
    default: return { ...base, id: 'hab-5', title: 'Seal and pressurise the habitat',
      step: b.pressure > 0 ? `Pressurising ${Math.round(100 * b.pressure / PRESSURE_SECONDS)}% · stay within 6 m` : 'Use the green valve at the foot of the first stairs',
      detail: 'Open the valve and stay close while air from the lander tanks fills the cabin. Then you can go inside through Airlock 01.' };
  }
}
export function habBuildLog(o, modules = 6) {
  if (!o?.habBuild) return [];
  const s = o.habBuild.step;
  return [...pioneerLog(o.habBuild), ...['Walk to the habitat site', 'Clear the building site', `Frame all ${modules} modules`, 'Fit the pressure shells', 'Attach the airlocks and stairs', 'Seal and pressurise the habitat']
    .map((title, i) => ({ title, done: s > i }))];
}

