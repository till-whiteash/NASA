# Power tutorial and mining integration

The local `feature/circuit-tutorial` branch combines the printer/circuit tutorial
from `fe1b49b` with the published habitat, surface, landing and mining fixes through
`9fe4e1f`. Ewan's habitat and outpost assets remain in place. This integration does
not replace or re-encode the authored HD movie files.

## Progression that must remain intact

1. Reach the habitat site and break its four site rocks, three strikes each.
2. Raise the module frames, unfold the shells, fit the airlocks and pressurise.
3. Complete the reserve and shelter checks.
4. Collect the landed power kits, print the printable parts, and complete the
   series, parallel and grounding circuit lessons before array assembly.
5. Assemble the array; clear the four power-field rocks; place all three panels.
6. Assemble/place the battery; connect the red and black solar leads, then the
   battery-to-base leads. The coiled slack, plugs and ground rod are retained.
7. Continue to water, food and charger tasks. Extra bases remain subject to the
   one battery plus three panels per base rule.

Existing saves retain their habitat, printed-parts, circuit-lesson, construction,
mining and power progress. Ordinary scenery rubble, quest site rocks and mineral
deposits are different resources: clearing scenery must not award mineral samples
or remove the tutorial's targets; mineral deposits still provide ore.

## Compatibility fix

`Construction` caches nearby rock metadata for efficient picking. Habitat/layout
changes can subsequently hide a rock instance using `clearRocksAround`. Picking
now reads each candidate's current instance transform and ignores hidden instances.
The old cached transform could otherwise keep an invisible rock target alive and
intercept a strike. The visible tutorial rocks and ore rules are unchanged.

Keep both sets of behavior when integrating future surface changes:

- `main.js`: retain the fabricator station, print/lab gates and capacity checks
  alongside the cinematic and player-led habitat flow.
- `habitat-build.js`: retain mineable site rocks, three-hit progress, accepted-swing
  handling and scenery clearance around the working area.
- `construction.js`: retain live-instance picking, four field stones, staged
  assembly/placement and separate positive/negative field cables.
- `colony.js` / resource zones: retain identified mineral deposits, bag yields and
  mined-state persistence independently from scenery removal.

## Checks run on the combined build

```sh
node scripts/test-power-tutorial.mjs
node scripts/test-mars-objectives.mjs
node scripts/test-construction.mjs
node scripts/test-player-tutorial.mjs
node scripts/test-habitat-build.mjs
node scripts/test-device-profile.mjs
node scripts/test-rover-terrain.mjs
node scripts/test-rover-support.mjs
node scripts/test-resource-zones.mjs
python scripts/test-circuit-lab-browser.py
python scripts/test-power-tutorial-browser.py
python scripts/test-habitat-build-browser.py
python scripts/test-tutorial-mining-integration-browser.py --out C:/tmp/tutorial-mining
python scripts/test-cinematic-video-fallback.py
```

The mining integration browser test uses the normal Construction ray/Use path for
all eight tutorial stones, checks hidden-scenery exclusion, samples an actual ore
deposit, and checks serialized cleared-stone progress. It does not force every
strike through `HabitatBuild.use`, so scenery-targeting regressions are visible.

The new regression reproduced the stale invisible target before the fix and
passed afterwards. Printer, all three lab lessons, habitat construction,
print/train/assemble gating, coiled leads, ground rod and seven film playback
checks passed. Test browser saves are isolated from the player's browser.

## Remaining handover work

The additional battery-to-base parallel wiring and optional animated field-current
dots remain separate follow-ups from `HANDOVER-POWER-TUTORIAL.md`. This compatibility
integration does not claim that those features are complete. Publishing is also a
separate step; this work is local until a push is requested.
