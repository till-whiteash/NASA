# NASA game: completed guided construction handover

Updated 15 November 2026 (Asia/Singapore). This is the implementation handover
from the delegated GPT-6 Astra continuation to its supervising parent agent.

## Checkout and ownership

- Worktree: `C:\NASA\Zhetalis-Nasa-tutorial`
- Branch: `feature/circuit-tutorial`; use `git log -4 --oneline` for final commits.
- Tutorial/published merge: `74882ee`, retaining `fe1b49b` and `9fe4e1f` behavior.
- Parent's separate science commits: `83f04ce` and `f68e898`. Preserve them.
- Shared checkout `C:\NASA\Zhetalis-Nasa` has unrelated edits. Do not overwrite it
  with this checkout or copy its main.js here. Do not reset or clean either tree.
- All work stays local. Nothing in this handover authorizes a push or deployment.

The parent delegated gameplay, guides, tests and this handover to this agent.
The parent exclusively implemented `game/mission-geometry/**` and
`scripts/mission-geometry/**`. Those directories are already committed separately;
the gameplay commit must not absorb unrelated changes in them. No further fork
is needed. The original task was to make a README and have this agent finish the
work under the parent's supervision.

## Latest user decisions

Keep the game first person, simple and fully guided for children aged 10-12.
Show one next action, a world marker and E / Action. Put detail under Why / manual.
Preserve mining stones, mineral yields, existing tutorials, saves and Ewan's work.
Use optional films at meaningful points, never to auto-complete construction.
Show actual screenshots after visible changes, then continue.

**Latest artwork correction:** use Zhetela's app-style UPPER-BODY framing, centred
vertically beside her message, not the tiny full-body figure. This is implemented
for the game guide and manual. It uses the existing original artwork and wave
with a display viewport matching `C:/Zhetela/character_art.py`'s portrait framing.
Source PNGs are unchanged. The lower edge fades softly; stars twinkle; reduced
motion is static. See `game/assets/zhetela/provenance.json` for hashes and sources.

## Completed behavior

- New arrival enters the pod in first person, suit checked. The normal airlock
  cycle records actual exit; the lander stays the refuge until habitat completion.
- Six orange cargo/salvage bundles provide the complete build budget and calibrator.
  Three blue instruments require a short nearby measurement; walking away cancels.
- Existing four habitat rocks stay mineable. Six foundations/frames can be built
  in any order, then shells, airlocks/stairs and pressure commissioning follow.
- Existing printer, series/parallel/bonding circuit bench, assembly gates and
  four power-field stones remain. Ore deposits retain their separate yields.
- Existing solar/controller/battery/base/charger field connections use both leads.
  New additional batteries are physically placed, inspected and wired in parallel
  before adding 4 kWh capacity once. Reverse connections give retry guidance.
- Loaded/shared battery state hides obsolete cables. Loaded/shared habitat state
  resets partial visual animations, preventing a complete base remaining squashed.
- Low-air rescue before the habitat is built returns to the POD, not an unavailable
  interior. Saved collected cargo survives a full page reload and Resume.
- Quest guidance labels habitat/battery destinations accurately. One action remains
  expanded; Why and the manual hold the deeper science.
- Manual chapters connect build, power, rover, life, weather and flight to authored
  films. Watching/skipping preserves construction and returns to the manual.
- The flight archive has an optional Earth-Mars radio-delay explorer link. It opens
  a separate tab; the original manual/mission stays open. It adds no quest or quiz.

Details, source reading, material budget, file responsibilities, restrictions and
reproducible test commands: [game/POWER-TUTORIAL.md](game/POWER-TUTORIAL.md).
The older [HANDOVER-POWER-TUTORIAL.md](HANDOVER-POWER-TUTORIAL.md) is historical;
its extra-battery follow-up and soil-grounding description are superseded.

## Important implementation files

- `game/src/pioneer-state.js`, `habitat-build-state.js`, `habitat-build.js`: cargo,
  calibration, inventory spending and staged habitat geometry/collisions.
- `game/src/battery-bank-state.js`, `battery-bank.js`: physical parallel branches.
- `game/src/construction.js`, `construction-state.js`, `power-tutorial-state.js`:
  interaction rays, field wiring, polarity, protection and power-set budget.
- `game/src/circuit-lab.js`: conductive bonding-bar demonstration and teaching units.
- `game/src/main.js`, `sim.js`, `mars-objectives.js`, `player-tutorial.js`: arrival,
  rescue, progression, persistence, guidance, contextual manual/archive entry.
- `game/src/field-manual.js`: optional chapters and film mappings.
- `game/src/zhetela.js`, `game/construction.css`, `game/moon/hud.css`,
  `game/assets/zhetela/`: approved portrait, wave and stars. PNG budget ~25 MB,
  wave loaded only when needed; no remote image service.

## Verification status

Passed pure-state tests: pioneer state, battery bank, habitat build, Mars
objectives, construction, power tutorial, player tutorial, device profile,
rover terrain, rover support, resource zones (11 scripts).

Browser checks passed:

- Actual arrival -> visible cockpit/manual -> film -> airlock -> first EVA.
  Optional explorer opens separately. Film leaves build JSON unchanged.
- Two recovered bundles survive actual reload/Resume. Forced low air rescues to pod.
- Normal targeting ray collects all six bundles and measures all three sites;
  walking away cancels; final inventory correct; legacy save still builds.
- Six frames, shells, pressure, all 24 original colliders, stairs and greenhouse.
- New battery normal-ray placement, inspection, reversed lead rejection, red-only
  state, completed pair, one-time capacity, partial state restoration and visuals.
- Printer station, print/train/assemble gates, both coiled field leads and chassis
  bond. Circuit lab separately passes series/parallel/fault/bond/printer checks.
- Mining integration: all eight three-hit quest stones through the normal ray,
  hidden scenery exclusion, a real ore deposit's +2 sample yield, serialized progress.
- Upper-body guide photos for desktop/phone and manual fitting a 390px viewport.

The cockpit issue was in the TEST, not a missing game button. Playwright evaluates
returned functions; returning the modal's close function immediately closed it.
Use `page.evaluate("()=>{game.station('ship-panel');}")`, not a bare expression.
After a film, wait for its fade element to detach before taking a clear screenshot.
Expected HTTP disconnects while skipping movies are suppressed by the test server;
page errors remain failures.

Evidence folder:
`C:\Users\Lenovo\.codex\visualizations\2026\11\13\01a1d56b-ef59-7f00-bbce-93101280eea1\pioneer`

Useful images: `zhetela-guide.png`, `zhetela-guide-phone.png`, `field-manual.png`,
`field-manual-phone.png`, `first-person-pod.png`, `first-eva.png`, `pod-rescue.png`,
`mission-archive-link.png`, `parallel-bank.png`, `cargoPhoto.png`, `surveyPhoto.png`,
`framesPhoto.png`, `finishedPhoto.png`, plus `lab/`, `mining/` and `habitat/`.
Results include `arrival-and-film.json`, `pioneer-build.json`, `parallel-bank.json`.

## Comparison sources and science split

Approved source folder `C:\Compeition_TWA` was refreshed: eight fast-forwarded,
four current, one dirty checkout preserved, six unavailable. Report is
`.../01a1d56b-ef59-7f00-bbce-93101280eea1/twa-update-report.json`.

Best references:

- [ASTRA](https://github.com/HamzaAli0911/astra-mission-trainer), MIT, `6cb022d`:
  guided curriculum, action-driven completion and walkable layout.
- [AstroBase](https://github.com/RAZAULLAH-KHAN/AstroBase-Junior-Mission-Commander),
  MIT, `c9339e8`: power budgets, dependency chains and explaining consequences.

These supplied design concepts, not copied renderer/source code. Keep notices
if substantial source is copied in a future change.

Parent's optional science work is documented in
[game/mission-geometry/README.md](game/mission-geometry/README.md). Displayed data
comes from bundled NASA/JPL Horizons snapshots. Siderust is an independent,
AGPL-licensed offline validation tool, not NASA data, not a browser dependency
and not a mandatory child-facing orbital-calculation step. Do not overstate
that page as trajectory design, terrain shadow simulation or live telemetry.

## Deliberate limits / next integration

- Fixed engineered footprints and choice of build order, not arbitrary walls or
  free relocation of the whole habitat. Existing greenhouse Builder remains.
- Prelanded equipment remains visible; do not claim the entire site is empty sand.
- Electrical/structural values and timings are educational abstractions, not
  certified spacecraft design or a safe real-life wiring procedure.
- No optional field-current dots added. No new co-op conflict-resolution protocol;
  targeted shared-state visual reconciliation was checked, not all network races.
- Parent's data prototype is separate; retain its commits and evidence.
- Review the local gameplay commit, then ask for deployment only if the user
  requests it. Do not follow the historical push commands automatically.
