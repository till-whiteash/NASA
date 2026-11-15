# Power equipment and first-person model follow-up

Local implementation on `feature/circuit-tutorial`; no push or deployment.

## What was wrong

The workbench loaded detailed approved Blender parts, but fitted slots returned to solid placeholder shapes. Solar tables and the installed charger used procedural models, and extra battery packs were plain boxes. A held part picked up before its download finished could retain its placeholder. First-person tool animation also reset the camera offset to zero every idle frame.

## What changed

- `power-models.js` prepares shared approved templates, batches static geometry and preserves asset identity. Nine existing power GLBs match the animation checkout byte for byte; see `game/assets/power/model-audit.json`. No downloads or replacements of Ewan's habitat were needed.
- The solar field uses the approved PV module and support frame, with two portrait modules on each existing table. The existing terrain-fitted feet, legs, raycast surface root, colliders and tutorial footprints remain. Cleaning shares the original dust uniform. A complete table's replacement top takes eight mesh draws.
- Starter and expansion packs share `battery-cabinet.glb`. Extra-pack terminals sit on the cabinet shelf; its separate inspect target remains accessible. Parallel capacity still activates only after both leads.
- The installed charger uses the approved charging post and coiled rover connector. The gameplay socket and parking bay remain unchanged.
- Fitted workbench slots show their real parts. A held copy refreshes when its download finishes. Obsolete asynchronous bench loads cannot populate a newer lesson.
- Wire and chassis-bond visibility now follows restored progress instead of leaving completed cables visible after an earlier snapshot is applied.
- `eva-grip.js` attaches a dedicated Blender-authored EVA glove to the measured pick grip. It has four curled fingers, an opposing thumb, reinforcing pads, seams, pressure cuff and sleeve. The geometry follows the tool's entire idle/swing transform; depth between the glove and tool is preserved. The sleeve extends outside the view, and the camera anchor is restored after each swing.
- `construction.mine()` is the primary attack API. `construction.use()` inspects rocks on E, retaining other placement/wiring actions. `HabitatBuild.mine(mesh)` separates habitat mining. Visibility, live rock instance position and range are checked; state changes during a swing cannot resurrect a removed target. Ordinary rocks no longer refuse a hit just because another interactable happens to be nearby.

The parent supplies `holder.userData.toolKind` and `holder.toolRoot` from `makeTool()` and owns the actual mouse/E/touch routing and inventory UI.

## Verification

- State tests: `node scripts/test-construction.mjs`, `test-battery-bank.mjs`, `test-habitat-build.mjs`, `test-power-tutorial.mjs`.
- `scripts/test-battery-bank-browser.py --out <folder>`: real interaction ray placement, inspect, wrong polarity, both leads, one-time 4 kWh capacity increase and partial-state rollback.
- `scripts/test-power-models-browser.py --out <folder>`: actual game arrival, installed model identity through progression, fitted and held parts, panel collision height, shared dust, glove alignment, idle offset, real saved-game reload with low graphics, screenshot evidence and browser errors.
- `scripts/photo-power-models.py --out <folder>`: reproducible field/workbench/hand photos.
- `scripts/test-tutorial-mining-integration-browser.py`: all four habitat and four power rocks clear, stale scenery is ignored, hematite gives two samples, and cleared progress is saved.
- Headless Blender validation: 14,792 glove triangles, four named fingers, opposing thumb, pressure cuff and no nonfinite vertex coordinates.
- Parent independently passed actual E/left-click tests for habitat, power-site and mineral rocks, plus inventory save/reload and storage tests.

Evidence is under `C:/Users/Lenovo/.codex/visualizations/2026/11/13/01a1d56b-ef59-7f00-bbce-93101280eea1/pioneer/power-models-before` and `power-models-after`.

## Practical limits

The new hand is a dedicated game EVA grip, not a reconstructed NASA Z2 scan. It currently fits the pickaxe; the drill and jug retain their own existing view models. The detailed power models are used on every graphics preset. A temporary simple shape remains available while an asset loads or if its download fails, so the lesson does not become unplayable; `powerAssetState` reports loading/ready/failed. Imported habitat and rover assets, mineral deposits, fixed support footprints and save quantities were not redesigned in this pass.
