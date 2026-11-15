# Completed Earth launch (HD)

The opening mission used to stop `launch_earth-hd.mp4` at the `launch_pad` clip boundary (23.5 s), then resume the old WebGL flight at booster separation. That cut changed cameras, appearance and moving-part state exactly when the player needed to see the side boosters detach.

`complete_earth_launch.py` now builds a 56-second, 1920 x 1080, 24 fps Blender film from the existing `launch_earth.blend`. The original scene remains the source. The completed working file is `launch_earth_complete.blend`.

## Storyboard

| Film time | Action and lesson |
|---|---|
| 0-5.33 s | SLS on Pad 39B; four hydrogen/oxygen main engines start. |
| 5.33-14.67 s | Solid boosters ignite; liftoff and tower clearance. The launcher stays grounded. |
| 14.67-23.5 s | Max-Q and powered climb, with compressed mission time explained. |
| 23.5-27 s | Booster exhaust shuts down; both rigid boosters move outward and drift aft. |
| 27-30 s | Cyan 100 km Karman-line marker passes the ship; captions distinguish space from orbit. |
| 30-34 s | The launch escape tower accelerates clear under its own motor. |
| 34-39 s | Core-stage ascent and visible main engine cutoff. |
| 39-44 s | Orange core separates; upper stage and Orion remain together. |
| 44-47 s | Coasting above a curved Earth; the skipped waiting time is stated. |
| 47-53 s | Upper-stage burn raises the low point of the orbit. |
| 53-56 s | Engine cutoff and the final orbital coast before the fictional Mars journey. |

The camera stays on each release long enough to see attached, separating and separated states. Release pivots lie within the parts. Engine plumes stay with the appropriate stage and shut down before separation. The final Earth backdrop uses the existing project texture and is a cinematic illustration, not an orbital dynamics simulation.

The old launch facts are restored: vehicle and launcher heights, propellants, the boosters' share of liftoff thrust, Max-Q, the 100 km convention, escape-tower purpose, core staging and approximately 28,000 km/h in low Earth orbit. The old claim about actual current planetary positions is not attached to this pre-rendered illustration.

## Game integration

`startNew()` plays the whole film and then continues to the existing cruise/arrival flow. It no longer instantiates the legacy `Launch` renderer at the 23.5-second clip boundary. Skip and Escape still advance normally, and failed video loading still allows arrival. New asset version parameters prevent a stale 30-second film/caption pair from surviving an update.

The field manual's Earth launch entry automatically replays the complete film. Tutorials, stones, construction, inventories, saves and lunar launches are unchanged.

## Build and check

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.3/blender.exe' -b -P game/animation/scripts/complete_earth_launch.py -- --out C:/NASA/launch-preview --stills --render
```

Inspect the stills, then copy the output `launch_earth-hd.mp4` to `game/animation/previews/` and `launch_earth.captions.json` to `game/animation/glb/`.

```powershell
python scripts/test-launch-film-browser.py --out C:/NASA/launch-check --full-flow
```

The browser check uses the real movie and cinematic module: 1080p/56-second metadata; still playing after the old 23.5-second boundary; booster, Karman, tower, core, upper-stage and orbit captions; normal ending; Skip/Escape; phone caption bounds; and the actual new-game handoff to cruise. `launch-animation-audit.json` records release transforms before, at, and after separation.

## Sources and limits

- NASA Artemis I staging reference: https://www.nasa.gov/reference/artemis-i-mission-timeline/
- NASA booster thrust and launcher height: https://www.nasa.gov/blogs/missions/2025/02/19/stacking-complete-on-artemis-ii-rocket-boosters/
- NASA engine and upper-stage role: https://www.nasa.gov/missions/artemis/orion/fired-up-engines-and-motors-put-artemis-mission-in-motion/

This is an educational, time-compressed future Mars mission using the project's SLS assets. It is not a recording of Artemis and does not represent an approved crewed Mars launch design. The 100 km ring is a teaching marker, not an object in space.
