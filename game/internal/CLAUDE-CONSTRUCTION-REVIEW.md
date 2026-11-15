# Claude review - hands-on construction, Zhetela guide (8 Nov 2026)

Read-only review of `game/src/construction.js`, `construction-state.js`, `zhetela.js` and the integration points already in `main.js`
(`pressKey`, `performMissionWork`, `advancePower`, `syncPowerHardware`, `drawMissionHud`) plus `mars-objectives.js` and
`world.js` (`collide`, `swingTool`, `clearRocksAround`, `makeRocks`). No source edited, nothing run in your browser.

The flow is strong and matches the real-time first-person style: physical slots, a remote site you have to walk to, cables you walk
between sockets, and the state lives in saved `outpost` fields, so reloads resume. Below, **B** = blocks progress or input, **U** = UX,
**S** = science wording, **P** = performance. Each item ends with a suggested fix.

## Blockers (fix before integration is final)

**B1. `E` is hijacked by any rock under the crosshair.** `pressKey('KeyE')` calls `construction.use()` first. `update()` raycasts
`world.rocks` (all 520 instances) every frame, so any boulder within 3.3 m becomes `this.hit` and `use()` returns `true`:
- Without the pickaxe you get "Equip your pickaxe…" and **nothing else happens**: ice, cargo pods, panels and lookouts next to a rock can't be
  collected with E while the crosshair rests on that rock.
- With the pickaxe it starts the 3-strike *removal*, so an ore deposit beside an ordinary rock gets smashed with no ore, even though the
  message says deposits give samples.
- *Fix:* only consider `world.rocks` when `colony.tool === 'pickaxe'` **and** `o.powerStep <= 2` (or the rock is inside the marked work
  zone), and return `false` (fall through to `world.nearest()`) when `world.nearest()` has a target closer than the rock.

**B2. Any boulder in the world can be destroyed in 3 hits, including 5 m slabs.** `rock-<instanceId>` works on every instance. Landmarks
vanish, and kids learn a pickaxe flattens house-sized rock. (`collide()` skips `c.rock`, so boulders don't block walking anyway; this is
purely destruction.)
- *Fix:* allow it only for small rocks (e.g. scale < 1.2 m, or members of `lowRocks`) or rocks inside the power-site rectangle. Otherwise
  hint "Too big to move - go around it."

**B3. `R` throws away the whole bench session.** The hints say "R to cancel" for a held part or cable, but `cancel()` clears `kind` and
hides the bench. A kid who drops one part has to leave, reopen the workbench modal and start assembly again. Placed parts survive in
`placed`, but the session doesn't.
- *Fix:* `R` → drop `held` / `wire` only. Leaving the room or closing the bench ends the session.

**B4. Sockets are tiny targets on phones.** Hit testing uses the visible torus (r 0.13 m, tube 0.045) at up to 3.3 m. With a thumb-aimed
crosshair that is a few pixels.
- *Fix:* give each socket an invisible ~0.45 m sphere as its ray target, and while a cable is held, ring the *correct partner*
  socket in a distinct colour.

**B5. The site must be cleared before panels can be placed, but placement is never pointed out.** Ghost footprints stay hidden until
`cleared.length >= 4`. That's correct, and `marsObjective` says "Clear the remote power site". But after assembly the guide line is
"Kit assembled. Carry it to the marked outdoor site." For the array that is step 2, so the player arrives and sees rocks, no footprints.
- *Fix:* for `kind === 'array'` say "Kit assembled. Clear the 4 marked rocks at the power site, then place the panels." Also show a
  ghost outline (dimmed) before clearing, so the goal is visible.

## UX

- **U1. Zhetela gets overwritten by strike counters.** `this.guide('Rock: 2 more strikes.')` replaces the step instruction. `missionKey` hasn't
  changed, so `main.js` never re-shows the step. Move counters ("2 more strikes", "Solar panels placed 2/3") to the `construction.hint`
  prompt line or `toast`. Keep Zhetela for step changes, errors and the debrief. Or add a lightweight "restore last step after a
  transient line".
- **U2. Parts are three identical boxes** (only the middle one is blue), and order isn't enforced. Kids match by label, not by understanding.
  Give each part its own silhouette (frame = flat open rectangle, module = dark cell panel, connector = small cylinder with cable stub;
  battery = cell block, controller = box with heat-sink fins, output = socket). Require the frame or module first ("the frame holds the
  module"). It costs one extra rule and teaches assembly logic.
- **U3. You can't see what you're holding.** A held part vanishes from the bench and nothing appears in hand; only the hint text knows.
  Put a small copy in `world.viewSlot` (first person) or the bench "hand" position.
- **U4. Cable guidance.** While a wire is held: show the partner socket's name and distance in the hint ("→ Base IN · 48 m"). Make the
  existing quest/minimap target switch to that socket. Draw the preview along the ground (`heightAt`), like the final cable, instead of a
  straight line through terrain. Consider starting only from an **OUT** socket: it teaches the direction power flows, and the error message
  shrinks to "Start at an OUT socket."
- **U5. Zhetela card.** Close button is 36 px (your Moon rule is 44). The success pose (frame 3) is replaced by the idle loop after 650 ms;
  hold it ~1.5 s. On phones the card sits at `bottom: 190px`, so check it against the mission card, joystick and touch buttons with a rect
  test like the Moon one.
- **U6. Tap-to-aim carryover (minor).** A touch `pointerdown` without a drag leaves `world.aimPoint` at the tap spot, so the next Use button
  press aims there, not at the crosshair. Reset `aimPoint` to `null` after a successful `use()` or on `pointerup` without movement.
- **U7. Charger wording.** `begin('charger')` ends with "Carry it to the marked outdoor site". The objective then says "Use the marked
  parking bay". Use the same words in both ("parking bay").

## Science wording

- **S1.** The `Battery controller IN` label is right; teach it once: "The charge controller stops the battery over-charging and limits
  current." The debrief lesson already hints at this, so add the one clause.
- **S2.** Mars-specific: the field-power lesson could add "Dust on the panels cuts output; the panel-cleaning job restores it", and "The
  battery sits outside, so it needs heating at night (that's the heater load in the power panel)". Both are already game mechanics
  (`clean`, `heaterKWh`).
- **S3.** Clearing site rock with a hand tool: fine for small loose rocks. Say "small rocks" in the objective (ties to B2) so it doesn't imply
  breaking bedrock.
- **S4.** "A connected battery can supply the base after sunset while charge remains": good, keep "while charge remains".

## Performance / hygiene

- **P1.** Raycasting the 520-instance `world.rocks` every frame (plus `interior.scene.updateMatrixWorld(true)`) is wasteful when no rock
  interaction is possible. Gate it as in B1.
- **P2.** `begin()` calls `bench.clear()` without disposing the old part/slot geometries and materials; each assembly leaks 6 meshes. Share
  one geometry and dispose the materials.
- **P3.** `assets/zhetela-sprites.png` is **2.6 MB** but drawn at 68-160 px, and it loads on every page that imports `zhetela.js` (Mars and
  Moon). A 3×2 sheet at ~480×320 WebP would be ~30-60 KB.
- **P4.** `update()` forces `settlement.cable` / `chargerCable` invisible every frame while `syncPowerHardware` sets them visible. It's
  harmless but they fight. Remove the visibility lines from `syncPowerHardware` now that `Construction` owns the cables.

## Checks that passed

- Pickaxe is in the starting belt (`belt: ['pickaxe']`), so clearing can't soft-lock on a missing tool.
- Rock removals are saved by instance id. Rock generation is deterministic per site with a fixed count (520), so ids map to the same rock
  after reload.
- Cleared training rubble stops blocking: `collide()` skips colliders whose `object` is hidden.
- Circuit order is enforced (`circuitReady`), connections work from either end, and old saves default to connected power, so nothing
  regresses.
- Charger: assembly sets `chargerStep = 1` only on completion; placement/connection follow `marsObjective`.
- `zhetela.js` respects `prefers-reduced-motion` and hides while a modal is open.

## ASTRA (C:\Compeition_TWA\HamzaAli0911--astra-mission-trainer)

I read only its README for context. No code or assets were compared or reused. Your construction loop is clearly different (first-person,
physical slots, walked cables; ASTRA is pad-based building with panels and cards). Shared ideas are generic to the challenge brief. If you
want to borrow *concepts* (not wording or art), two that fit your style: a live **battery "runs out at" forecast** next to the power HUD,
and ending each milestone debrief with **one quick check question**. Write both in your own words and UI.

## Suggested order
B1 → B3 → B4 → B5 → U1 → B2 → U2/U3 → P3, then a phone rect pass (U5).
