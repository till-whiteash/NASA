# Handover: power tutorial (3D printer, circuit lab, grounding, coiled cables, power per base)

Written for Codex to continue. All of this is committed on a local branch and **not pushed**.

## Where the work is

| | |
|---|---|
| Worktree | `C:\NASA\Zhetalis-Nasa-tutorial` (its own folder; don't edit this work in `C:\NASA\Zhetalis-Nasa-anim`) |
| Branch | `feature/circuit-tutorial` (local only) |
| Base | `c271fd8` "Build the habitat step by step and make the films play instantly" |
| My commit | `fe1b49b` Power tutorial: 3D printer, circuit lab (series, parallel, grounding), coiled cables, one battery + array per base |
| Live game | GitHub Pages from `till-whiteash/NASA` `main` (git remote `personal`) |
| Team repo | `Code-AAR/Zhetalis-Nasa` (remote `origin`). PR #1 there is stale; its branch would carry the Git LFS model library. |

**Watch out:** another agent was working in `C:\NASA\Zhetalis-Nasa-anim` (branch `codex/briefing-video-first`) with uncommitted edits to `game/src/main.js`, `cinematic.js`, `launch.js`, `seq_ares_briefing.py` and the briefing films. My branch also changes `main.js`, so expect a merge conflict there (see "Merge and push" below).

The user's request (summarised):
1. The tutorial teaches the player to build everything from scratch.
2. Parts are made on the 3D printer, then assembled step by step.
3. Teach series and parallel wiring and grounding in detail, showing current and voltage flow, including flow to ground, and why grounding matters.
4. Then wire the solar panel to the battery (VCC and GND), and the battery on to the base.
5. One battery plus one solar array can power at most one base.
6. Cables should look like real coiled wires.

## What is done (in `fe1b49b`)

### New files
- **`game/src/power-tutorial-state.js`:** pure rules, unit-tested.
  - `PRINTABLE` lists the printable parts, each with feedstock cost, print seconds and its model in `assets/power/`. `FROM_EARTH` explains that solar cells and controller chips come from Earth.
  - `powerLearn(o)` creates `o.powerLearn = { feed: 20, printed: [], lab: {} }`. Saves with `powerStep > 1` count as already printed and trained, so old saves keep working.
  - Helpers: `missingPrints(o, kind)`, `canPrint`, `printPart`, `recycleSample(o, store)` (one mineral sample makes +3 feedstock), `labDone`, `completeLab`.
  - `powerLearnObjective(o)`:
    - at `powerStep` 1 it returns `print-array` (target `fabricator`), then `lab-series`, `lab-parallel` and `lab-ground` (target `workbench`);
    - at step 3 it asks for any battery parts still missing.
  - Capacity rule: `powerSets(o) = min(1 + upgrades.battery, floor(panels / 3))`; `canPowerAnotherBase(o, colony.s)`; `powerCapacityNote(o, c)`. The main habitat plus each greenhouse counts as one base.
- **`game/src/fabricator.js`:** `openFabricator({ outpost, store, save, need })`, a full-screen 3D printer overlay.
  - The scene has an aluminium frame, a heated bed, a moving print head and a filament spool.
  - The part's real GLB from `assets/power/` is revealed bottom-up with a clipping plane as layers print.
  - Print time is measured in wall-clock seconds, so it's the same at any frame rate. A stand-in block prints until the model arrives.
  - "Print everything needed" queues the parts; the recycle button turns stored minerals into feedstock.
  - Test hook: `document.querySelector('.fabricator').fab` has `printAll()` and `busy()`.
- **`game/src/circuit-lab.js`:** `openCircuitLab({ start, done, onStep })` returns a Promise.
  - **Solver:** real nodal analysis. Cells are Norton sources (12 V, 0.01 Ω, 20 Ah); wires are 0.004 Ω; the lamp is 2.3 Ω (1 kW at 48 V). Gaussian elimination, with node `G` (the ground rod) as 0 V and a tiny leakage on every node so floating parts can be solved.
  - **Visuals:** dots move along each wire at a speed that grows with log(amps), in the direction of conventional current. Terminal rings glow from blue (0 V) to orange (48 V). Floating labels show volts measured from ground in lesson 3, otherwise from the lowest point in the circuit.
  - **Meters:** volts, amps, watts, pack Wh and runtime, and "if an astronaut touched the frame" in mA, red at 30 mA or more.
  - **Interaction:** click a terminal, then another, to run a wire; click a wire to remove it. A short circuit (more than 60 A without a fault) is detected, the wire is removed, and the lesson explains why.
  - **Lessons, with detailed explanations in the left panel:**
    1. **Series:** chain four cells + to −, then to the lamp. Passes at 44 V or more with all four cells carrying current (about 46.8 V at the lamp).
    2. **Parallel:** a 2s2p pack. Passes at 22–26 V with every cell sharing the current. Teaches amp-hours versus voltage, and that the energy is the same but spent more slowly.
    3. **Grounding:** starts from the 48 V circuit, with a fixed green-yellow bond from the battery − to the ground rod.
       - "⚡ Cause a fault" (a frayed wire touches the frame) makes the frame live at about 47 V, and the body meter reads about 47 mA (dangerous).
       - The player wires the frame to the ground rod.
       - A second fault sends a huge current to ground, the 60 A fuse blows, and the frame stays at 0 V. Lesson passed.
  - Test hook: `document.querySelector('.circuit-lab').lab` has `connect(a, b)`, `fault()`, `readings()` and `startLesson(k)`. Terminal ids: `c0n`/`c0p` … `c3n`/`c3p`, `Lp`, `Ln`, `F`, `G`.
- **`game/circuit-lab.css`:** styles for both overlays. On wide screens the 3D view is offset to the right of the panel; on phones the panel moves to the bottom.
- **Tests:**
  - `scripts/test-power-tutorial.mjs` (unit);
  - `scripts/test-circuit-lab-browser.py` (all three lessons and the printer, with optional screenshot folder);
  - `scripts/test-power-tutorial-browser.py` (full in-game flow; an optional path argument saves a field screenshot).

### Changed files
- **`game/src/main.js`:**
  - Imports the new modules.
  - Station `fabricator` calls `openPrinter()`.
  - `openWorkbench()` is now a gate. At power step 1 or 3 with parts unprinted, it shows "print first". At step 1 with training not done, it offers "Open the circuit lab". Otherwise it calls `openWorkbenchMenu()`, the old function renamed.
  - The workbench menu gets a "🔬 Practise in the circuit lab" button once training is done.
  - The charger kit needs printed parts.
  - Building a greenhouse is blocked by `canPowerAnotherBase`, with a toast explaining why.
  - The quest marker and navigation lists include `'fabricator'`.
- **`game/src/hab-dressing.js`:** the 3D printer prop's "note" became a real station: `{ type: 'fabricator', label: 'use the 3D printer' }` in the workshop pod. The old note is disabled with `if (false)`.
- **`game/src/mars-objectives.js`:** calls `powerLearnObjective` after the habitat build and safety checks. The mission log gets "Print the power parts" and "Circuit training" rows.
- **`game/src/builder-recipes.js`:** the greenhouse quest shows the power-capacity note when there's no free battery and array set.
- **`game/src/construction.js`:**
  - Field socket labels are now "VCC + (red)" and "GND − (black)".
  - `fieldCable()` draws each lead with plug bodies and nuts at both posts, drops it to the ground, coils 2.5 turns of slack near each end, and runs it along the ground.
  - Once both solar leads are on, `groundBond()` adds a copper ground rod and a green-yellow bonding lead beside the battery cabinet.
- **`game/src/construction-state.js`:** `POLE_NAME` now says VCC + and GND −.
- **`game/src/player-tutorial.js`:** new lessons "Print the parts" and "Circuit training".
- **`game/index.html`:** links `circuit-lab.css?v=1`.
- **`scripts/test-mars-objectives.mjs`:** expects print, then lab, then power-1.

### Verified (all passing at `fe1b49b`)
```bash
cd C:/NASA/Zhetalis-Nasa-tutorial
node scripts/test-power-tutorial.mjs
node scripts/test-mars-objectives.mjs
node scripts/test-construction.mjs
node scripts/test-player-tutorial.mjs
PYTHONIOENCODING=utf-8 python scripts/test-circuit-lab-browser.py "C:/tmp/labshots"
PYTHONIOENCODING=utf-8 python scripts/test-power-tutorial-browser.py "C:/tmp/field.jpg"
```
The browser tests use Playwright with Edge (`channel='msedge'`) and SwiftShader. They start their own static server on a random port.

## What is left (in order)

1. **Series and parallel at the base end.** The user asked that the battery "on the other end hook it to the base series parallel". Today the battery-to-base circuit is a single red and black pair. Plan:
   - When the player builds an Extra battery (`outpost.upgrades.battery += 1`, see `sim.js` `buy()`), add a second battery cabinet beside the first.
   - Add new field sockets, `battery2-in` and `battery2-out`, in `construction.js` `point(...)` and in `CIRCUITS` / `SOCKET_LABELS` in `construction-state.js`.
   - Make the player wire the two cabinets in **parallel**: + to + and − to −, keeping 48 V and doubling the kWh. A same-colour check like `connectLead` applies.
   - Optionally offer the series choice and explain why it's wrong here: 96 V would exceed the 48 V bus.
   - Reuse the lab's lessons in the guide text: "parallel keeps 48 V and adds capacity".
   - Store the leads in `buildState(o).leads[index]`, as the existing circuits do.
2. **Optional: current flow in the field.** Animate dots along the field cables (as in `circuit-lab.js`'s `flows`) when the circuit carries power, for example in daylight from panels to battery and at night from battery to base. Use `outpost.today` / `world.night` to choose the direction and speed.
3. **README.** Add a "Power tutorial" section to `game/animation/README.md` (or a new `game/POWER-TUTORIAL.md`), summarising the files and lessons above.
4. **Merge and push** (only when the user says to push).

## Merge and push (when the user says to push)
```bash
# 1. Bring the latest published code into the tutorial branch
cd C:/NASA/Zhetalis-Nasa-tutorial
git fetch personal
git merge personal/main          # resolve conflicts; main.js is the likely one: keep both sides' changes
# 2. Run every test again (list above), plus:
PYTHONIOENCODING=utf-8 python scripts/test-cinematic-video-fallback.py
# 3. Publish to the live site (GitHub Pages from till-whiteash/NASA main)
git push personal HEAD:main
# 4. Watch the Pages deploy, then check a new file is live
"C:/Program Files/GitHub CLI/gh.exe" run list --repo till-whiteash/NASA --limit 1
curl -s -o /dev/null -w "%{http_code}\n" https://till-whiteash.github.io/NASA/game/src/circuit-lab.js
```
- Don't push to `origin` (Code-AAR) without asking. That branch history includes the Git LFS model library under `pull/`, whose objects aren't on this PC.
- When creating a worktree, set `GIT_LFS_SKIP_SMUDGE=1`, or checkout fails on the `pull/` LFS files.
- Don't re-encode or replace `game/animation/previews/*-hd.mp4` (user's rule).

## Related, not part of this task
- A separate Claude session, "Game trailer cut to the team's voice recording", is making the trailer from `C:\Users\Lenovo\OneDrive\Documents\Sound Recordings\Recording.m4a` into `game/animation/trailer/` and re-rendering some films. It last reported the outpost and ascent films encoded, with the failure films, dust storm and both briefings still rendering.
