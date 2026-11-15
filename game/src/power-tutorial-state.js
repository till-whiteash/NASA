// Starter power, the learning way: print the parts on the 3D printer, learn series, parallel and grounding in the
// circuit lab, then assemble and wire for real. Pure state: saved fields are the single source of truth.
import {wiredBatteries} from './battery-bank-state.js';
import { ASSEMBLIES } from './construction-state.js';

// What the printer can make. Electronics (solar cells, controller chips, lithium cells) come from Earth:
// printers cannot make semiconductors or battery chemistry yet - the game says so.
export const PRINTABLE = {
  'Support frame':    { feed: 3, secs: 7, model: 'support-frame', what: 'An aluminium-filled polymer frame that holds the solar module at the right angle.' },
  'Output connector': { feed: 2, secs: 5, model: 'output-connector', what: 'Connector housings for the red VCC + and black GND - leads. The metal pins inside are pressed in after printing.' },
  'Battery module':   { feed: 3, secs: 7, model: 'battery-module', what: 'The battery tray and cell holders. The lithium cells that go inside were packed on Earth.' },
  'Protected output': { feed: 2, secs: 5, model: 'protected-output', what: 'The fuse holder. The fuse cuts the circuit if far too much current flows.' },
  'Charging post':    { feed: 3, secs: 6, model: 'charging-post', what: 'The rover charging pedestal shell.' },
  'Rover connector':  { feed: 2, secs: 5, model: 'rover-connector', what: 'The rover plug body and its grip.' },
};
export const FROM_EARTH = { 'Solar module': 'Solar cells are made of ultra-pure silicon in a factory on Earth.', 'Charge controller': 'The controller\'s computer chips were made on Earth.' };
export const START_FEED = 20;
export const LAB_STEPS = ['series', 'parallel', 'ground'];

export function powerLearn(o) {
  if (!o.powerLearn) {
    // saves from before this tutorial existed already have working power: count it as learned
    const veteran = (o.powerStep || 0) > 1;
    o.powerLearn = { feed: START_FEED, printed: veteran ? Object.keys(PRINTABLE) : [], lab: veteran ? { series: true, parallel: true, ground: true } : {} };
  }
  return o.powerLearn;
}
export function missingPrints(o, kind) { const p = powerLearn(o).printed; return (ASSEMBLIES[kind] || []).filter(n => PRINTABLE[n] && !p.includes(n)); }
export function canPrint(o, part) {
  const L = powerLearn(o), spec = PRINTABLE[part];
  if (!spec) return { ok: false, why: FROM_EARTH[part] || 'That part cannot be printed.' };
  if (L.printed.includes(part)) return { ok: false, why: 'Already printed.' };
  if (L.feed < spec.feed) return { ok: false, why: `Needs ${spec.feed} feedstock; you have ${L.feed}. Recycle a mineral sample into feedstock.` };
  return { ok: true };
}
export function printPart(o, part) { const c = canPrint(o, part); if (!c.ok) return c; const L = powerLearn(o); L.feed -= PRINTABLE[part].feed; L.printed.push(part); return { ok: true }; }
// one mined mineral sample from the store melts and extrudes into 3 units of printer feedstock
export function recycleSample(o, store) {
  const ore = Object.keys(store || {}).find(k => store[k] > 0); if (!ore) return null;
  store[ore] -= 1; powerLearn(o).feed += 3; return ore;
}
export function labDone(o, step) { const lab = powerLearn(o).lab; return step ? !!lab[step] : LAB_STEPS.every(s => lab[s]); }
export function completeLab(o, step) { powerLearn(o).lab[step] = true; }

// The objective before each workbench assembly: print first, then circuit training before the first assembly.
export function powerLearnObjective(o) {
  if (o.powerStep !== 1 && o.powerStep !== 3) return null;
  const kind = o.powerStep === 1 ? 'array' : 'battery', need = missingPrints(o, kind);
  if (o.powerStep === 1 && missingPrints(o, 'battery').length) need.push(...missingPrints(o, 'battery'));
  if (need.length) return { id: 'print-' + kind, title: 'Print the power parts', step: `${powerLearn(o).printed.filter(n => PRINTABLE[n]).length} printed · next: ${need[0]}`,
    detail: `Go inside to the 3D printer and press E / Action. Print: ${need.join(', ')}. The solar cells and charge controller came from Earth.`, target: 'fabricator' };
  if (o.powerStep === 1 && !labDone(o)) {
    const next = LAB_STEPS.find(s => !labDone(o, s));
    return { id: 'lab-' + next, title: 'Circuit training', step: { series: 'Lesson 1 of 3: series', parallel: 'Lesson 2 of 3: parallel', ground: 'Lesson 3 of 3: grounding' }[next],
      detail: 'Go to the workbench and press E / Action. Wire real cells in series and parallel, then learn why everything is grounded.', target: 'workbench' };
  }
  return null;
}

// One battery and one solar array (3 panels) can power at most one base. The main habitat uses the first set;
// every greenhouse you add needs another battery and three more panels.
export const PANELS_PER_ARRAY = 3;
export function powerSets(o) { return Math.min(1 + wiredBatteries(o), Math.floor((o.panels || 0) / PANELS_PER_ARRAY)); }
export function basesPowered(c) { return 1 + (c?.greenhouses || []).length; }
export function canPowerAnotherBase(o, c) { return basesPowered(c) < powerSets(o); }
export function powerCapacityNote(o, c) {
  const sets = powerSets(o), bases = basesPowered(c);
  if (bases < sets) return `Power for ${sets - bases} more base${sets - bases > 1 ? 's' : ''}.`;
  if(wiredBatteries(o)<(o.upgrades?.battery||0))return 'Place, inspect and connect your extra battery at the field power site. An unwired pack cannot power another base.';
  const needBat = bases + 1 > 1 + (o.upgrades?.battery || 0), needPanels = Math.max(0, (bases + 1) * PANELS_PER_ARRAY - (o.panels || 0));
  return `One battery and one solar array power one base. To power another: ${[needBat ? 'build an Extra battery' : '', needPanels ? `add ${needPanels} more solar panel${needPanels > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')}.`;
}
