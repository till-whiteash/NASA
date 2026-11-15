# Guided habitat and field-power tutorial

This local feature combines Claude's printer/circuit tutorial (`fe1b49b`) with
published habitat and mining fixes through `9fe4e1f`, integrated at `74882ee`.
It preserves Ewan's habitat, access routes, outpost hardware and authored movies.
No HD film is replaced or re-encoded. Commit history records subsequent work.

## What the player does

1. Arrive in the first-person landing pod with the suit checked. Use the hatch,
   wait for the pressure cycle and open the outer hatch.
2. Follow the marker to six orange cargo bundles. Unpack structural alloy,
   sealed membranes, seals and a calibrator. Some bundles include recovered
   structural plates. These are flight supplies, not ore turned into chips.
3. Use three blue survey instruments, staying within 3 m for three seconds each.
   Walking away cancels that measurement; completed readings remain saved.
4. Clear four habitat-site rocks with three pickaxe strikes each. Choose the
   order of six module footprints; each foundation/frame rises into place.
5. Use the yellow post to unfold shells, fit the airlocks/stairs, then use the
   green valve and stay within 6 m through the eight-second pressure check.
6. Check reserves and shelter. Collect power kits, print printable parts, and
   finish series, parallel and protective-bonding lessons at the circuit bench.
7. Assemble the solar kit; clear four separate power-field stones; place three
   panels. Assemble and place the battery cabinet.
8. Connect both red + and black - leads from the array to the charge-controller
   input, then the protected battery output to Base IN. Match signs and colours.
   Wrong connections explain the issue and leave the circuit disconnected.
9. Manage the powered base's oxygen, heater, water, crops and food reserves.
   Build/connect the rover charger and expand only when power is sufficient.
10. An Extra battery purchase supplies a new cabinet. Place it on the marked pad,
    inspect it and connect matching +/+ and -/- leads to the protected bus.
    Commissioning adds 4 kWh of capacity once, not free stored energy. Voltage
    remains 48 V. Another base requires another commissioned pack and three panels.

The default guide shows one next action and E / Action. More detailed reasoning
is optional under Why / Field manual; children do not solve equations to proceed.
The landing pod remains a refuge until the habitat is finished. Low-air rescue
returns the player to that pod if the base is not yet pressurised.

## Construction and saves

`habBuild.pioneer` holds pod exit, six unique cargo IDs, three survey results,
material stock and unique spending keys. Cargo totals are 18 alloy, 12 membrane
and 6 seal kits. Six frames cost 12 alloy + 6 membrane; shells cost 6 membrane +
2 seals; airlocks cost 2 alloy + 4 seals. The remainder is 4 alloy.

`batteryBank` holds placed/checked/connected indices and each branch's fitted
leads. A purchase does not increase battery capacity. The second correct lead
commissions the branch; repeat actions cannot credit it twice. Visual wires
follow loaded state, including a partly wired branch. Older saves with already
credited battery upgrades keep those upgrades. Existing habitat saves without
pioneer state retain their original build rules; saves without habitat state
keep their completed habitat.

Fresh missions build on fixed engineered footprints so existing interiors,
tunnels and ramps align. This is not arbitrary wall-by-wall placement. The
existing Builder still places greenhouse expansions. Prelanded site hardware
remains visible. Quantities and deployment times are training abstractions.

Shared habitat updates replace temporary local frame/shell animations, so a
completed snapshot cannot leave a half-scaled habitat. Existing co-op state
transport is retained; this change does not introduce a new authoritative
multiplayer conflict-resolution protocol.

## Engineering distinctions

- Black - is the normal DC current return. Green-yellow is a separate conductive
  chassis bond to the protected source reference. Martian soil is not used as an
  ideal fault return. The lab now has a bonding bar rather than a soil electrode.
- The bench uses 12 V teaching battery modules. Its resistive circuit solver
  demonstrates series voltage, parallel capacity and fault paths. The 1,000-ohm
  contact example illustrates a current path, not a human-safety certification.
- Solar cells and electronics arrive from Earth; the printer makes supported
  parts/housings. The charge controller regulates the solar-to-battery path.
- Equal-voltage parallel packs add capacity. The training inspection represents
  secure mounts, matched voltages, fuses, isolation, battery management and
  controlled precharge. It is not a real battery-wiring procedure or a full
  thermal/transient/spacecraft engineering simulation.
- Supported footings and frames, aligned tunnels, pressure membranes and seals
  are distinct mechanical functions. The pressure check is shortened for play.

Primary reading: [NASA grounding architecture](https://standards.nasa.gov/standard/NASA/NASA-HDBK-4001A),
[NASA BEAM](https://www.nasa.gov/international-space-station/bigelow-expandable-activity-module-beam/),
[SparkFun series and parallel](https://learn.sparkfun.com/tutorials/series-and-parallel-circuits/all).
NASA-HDBK-4001A concerns uncrewed spacecraft grounding architecture; it does not
certify this game or make it an operating procedure.

## Films and Zhetela

The field manual has build, power, rover, life support, weather and flight chapters.
The outpost film is a future-settlement demonstration; failure/repair clips
illustrate corresponding field tasks; the mission archive replays briefings,
launch, transit, descent and ascent. Watching changes neither construction state
nor inventory. Skip returns to the manual. The optional radio-delay explorer
opens in another tab from the archive, leaving the mission in its existing modal.

Approved PNG sources are listed and hashed in `assets/zhetela/provenance.json`.
The app's upper-body framing is applied at display time to the original standing
art and 36 wave frames. A soft lower edge and periodic star twinkles remain;
reduced-motion uses a static portrait. Source pixels are unchanged. Wave frames
are lazy-loaded on first guide use (about 25 MB); no AI generation service is used.

## Compatibility rules for future edits

- Keep fabricator, printing/lab gates and capacity checks in `main.js`.
- Keep both sets of four three-hit tutorial rocks, accepted-swing handling and
  clearance around them. Construction ray picking must use the LIVE scenery
  instance transform; removed scenery must not intercept a pickaxe strike.
- Ordinary rubble yields no mineral samples. Identified mineral deposits retain
  their separate bag yields and mined-state persistence.
- Preserve Ewan's model, colliders, steps/ramps and interiors through build stages.
- Never let an optional movie complete a build, spend cargo or clear a stone.

## Verification

Pure-state checks:

```sh
node scripts/test-pioneer-state.mjs
node scripts/test-battery-bank.mjs
node scripts/test-habitat-build.mjs
node scripts/test-mars-objectives.mjs
node scripts/test-construction.mjs
node scripts/test-power-tutorial.mjs
node scripts/test-player-tutorial.mjs
node scripts/test-device-profile.mjs
node scripts/test-rover-terrain.mjs
node scripts/test-rover-support.mjs
node scripts/test-resource-zones.mjs
```

Browser checks require Python Playwright and Edge. Use `PYTHONIOENCODING=utf-8`
on Windows. Each uses a private browser context, not the player's saved game.

```sh
python scripts/test-pioneer-arrival-browser.py --out C:/tmp/pioneer-check
python scripts/test-pioneer-build-browser.py --out C:/tmp/pioneer-check
python scripts/test-battery-bank-browser.py --out C:/tmp/pioneer-check
python scripts/test-zhetela-portrait-browser.py --out C:/tmp/pioneer-check
python scripts/test-habitat-build-browser.py C:/tmp/pioneer-check/habitat
python scripts/test-power-tutorial-browser.py
python scripts/test-circuit-lab-browser.py
python scripts/test-tutorial-mining-integration-browser.py --out C:/tmp/pioneer-check/mining
```

Arrival uses the actual mission flow, optional film, hatch cycle and save/reload;
its low-air check verifies rescue to the pod. Salvage and battery tests use the
normal first-person targeting ray. The mining regression uses that ray for all
eight tutorial stones, rejects invisible scenery and samples a real ore deposit.
The habitat geometry test inspects restoration of all 24 colliders, stairs and
greenhouse. The lab test checks series, parallel, fault/bond and printer output.
The popup test must call debug stations inside a callback without returning the
modal's close function: Playwright otherwise calls the returned function itself.

Optional field current-flow dots were not added. Detailed motor/transient/thermal
physics, arbitrary habitat placement and multiplayer race handling remain outside
this feature. No deployment is implied by passing these checks.
