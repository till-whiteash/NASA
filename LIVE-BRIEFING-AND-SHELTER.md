# Live projector briefing and walk-in training shelter

The Earth briefing is an in-world activity, not a cutscene. The astronaut can walk and explore while the commander projects the course material. The camera follows the player; dragging the room changes the view. WASD/arrow keys and touch direction buttons move the astronaut. Subtitles continue during exploration. Voice playback is optional, with mute and pause controls.

Knowledge checks require the astronaut to approach the projected screen. Answer controls are disabled outside its interaction radius. Incorrect answers explain the mistake and repeat the question without advancing. Original course pages remain available through Review original slide. This applies to the shared Mars, Moon and Orion training module.

The storm drill now has an actual walkable shelter. Complete the first two console actions to unlock its hatch. The third action routes the astronaut towards the doorway; it does not immediately mark entry complete. Completion is triggered only by crossing inside. The room has walls, a corridor collision boundary, seats, lighting, a status display, oxygen-tank props and a NASA equipment model. You can look around, walk inside, leave, and continue the remaining drills. The interior is authored for the game, not a NASA engineering design or validated radiation shield.

## Directly downloaded NASA model

The Habitat Demonstration Unit exterior was fetched directly from the original GLB link on https://science.nasa.gov/3d-resources/habitat-demonstration-unit/ . The asset is game/assets/training/shelter-hdu.glb. Its exact download URL, byte length and SHA-256 are in shelter-source.json beside it. Cached NASA Orbital Replacement Unit equipment is reused inside. The model exterior is revealed as a cutaway near the unlocked hatch so the playable room remains visible and accessible.

## Checks

- Real browser input moved the astronaut during active briefing subtitles.
- Answers stayed disabled away from the screen and enabled on approach.
- Incorrect answers retained the question and explanation.
- Mars course proceeded through the practical drills into the shelter; the inside flag and quiz activated after crossing the doorway.
- Dragging changed the interior view; leaving returned to the academy and the next drill remained usable.
- At 390px, controls fit without horizontal overflow and holding a direction control moved the player.
- Training-state regression tests and git diff whitespace checks passed.

This update is local and has not been published.


## NASA mission-control console
The briefing/testing station now uses one console extracted from NASA's hosted JSC Mission Control Room GLB (DigitalSpace Corporation). The original 185,220-byte asset and source/checksum record are in game/assets/training/jsc-mission-control*. The runtime selects complete triangles within one console bay, retaining the original desk, keyboard and monitor geometry with game-authored readable surface finishes. The raised slide frame and flight-director label are game-authored additions. This is a historic visualization asset, not an exact contemporary ISS console.
Source: https://science.nasa.gov/3d-resources/jsc-mission-control-room/
The live walkable briefing, slide content and correct-answer progression remain in place.
