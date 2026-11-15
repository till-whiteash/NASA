# Recommendation: tuned open exploration, retained as an internal prototype

For the direction you described, I prefer the **tuned Unity open layout** over
the current oversized central dome and over a direct swap of the original Unity
export. The smaller modules, open travel space and distant research sites give
the landscape room to matter. Keep the current production game until the new
layout is connected to the interior, oxygen/power economy and full mission flow.
Those systems were deliberately not rewritten in this isolated experiment.

## What was actually compared

All variants use the same current-checkout World, terrain, camera and movement.
The original and tuned variants are visual comparisons against the existing
collision rules. Open Exploration also refits module collisions and the door
target, hides old outpost props, removes tall collectible beams, reduces terrain
colour saturation, and adds a meteorite field, relay station and subsurface survey.
Test travel buttons are preview tools. All survey locations are fictional.

| Habitat | Triangles | Meshes | Habitat texture estimate | Outcome |
| --- | ---: | ---: | ---: | --- |
| Current | 888 | 6 | No habitat image maps | Cheapest; established gameplay; visually dominates the camp |
| Unity original | 231,755 | 30 | 524 MiB | Oversized terrain in export makes the actual buildings tiny when fitted; unlit materials ignore day/night lighting |
| Unity tuned | 144,172 | 19 | 25.3 MiB | Export terrain removed; human-scale buildings; materials respond to light |
| Unity open layout | 144,172 | 19 | 25.3 MiB | Preferred direction; fitted module collisions; meaningful empty space and distant sites |

Texture estimates are RGBA8 plus mipmaps for habitat colour maps only, not actual
GPU allocations or total game memory. The tuned habitat estimate is about 95%
lower than the original. The original has 27.2 MB of JPEG textures plus a 9.4 MB
geometry buffer. The tuned buffer is 6.4 MB and its active textures are smaller.
The tuned base still has far more triangles than the current model; it needs
further mesh reduction/LODs before assuming it suits low-end school devices.

In one desktop browser run, 90-frame median intervals were approximately 7.1 ms
current, 8.2 ms original, 8.4 ms tuned and 8.4 ms open. Median render-call CPU time
was 0.7, 0.9, 1.1 and 1.1 ms respectively. These are local observations, not
portable FPS promises. Open had fewer visible scene draw calls because the old
props were removed, but more triangles. Shader/cache state and other work in the
shared checkout can affect these numbers.

## Gameplay verification

- Current and original visual-swap tests reached all four route points and the
  existing door in 20.18 simulated walking seconds. The original swap produced
  two sampled visual wall crossings despite the old collision route succeeding.
- The open layout reached all four refitted route points and its airlock in
  24.32 simulated seconds with no sampled visual wall crossing on that route.
- Meteorite and subsurface-site interactions were exercised through the actual
  E key handler. Day/night and camera/movement modes worked without runtime errors.
- The lab fit at 390 px without horizontal overflow. This is a layout check, not
  a physical phone performance test. Other paths, all model surfaces, game balance
  and the production interior still need testing before promotion.

## Mars cross-check, 6 November 2026 Singapore time

The private key was used successfully with NASA EPIC. EPIC verifies authenticated
NASA access and the Earth reference, **not Mars surface geography**. NASA DONKI
did not respond successfully during this audit, so no live local radiation or
storm-dose validation is claimed. No key appears in the saved checks.

Mars-specific public services also responded: the NASA Image Library returned
Spirit/Gusev panoramas; JPL Horizons returned 208,168,056 km Earth–Mars separation
and about 11.6 light-minutes for 6 November; the Curiosity REMS feed's newest
usable record was **25 August 2026**, −71 to −5 °C and 777 Pa. That is an archived
Gale Crater measurement, not current Gusev weather or the fictional 2126 mission.
Machine-readable results and source links are in `unity-model-lab/science-check.json`.

I recommend these art/science constraints:

1. Keep a dry, rocky, basaltic plain with dust and sparse landmarks, consistent
   with [Spirit's Gusev surface images](https://nssdc.gsfc.nasa.gov/planetary/mars/mars_exploration_rovers/mera_images.html).
   Retain the [NASA Spirit-derived terrain](https://science.nasa.gov/3d-resources/mars-spirit-landing-site/),
   but reduce its vertical exaggeration in a future coordinated terrain/physics
   pass; the present mountains are gameplay scaling, not a surveyed skyline.
2. Keep dusty rusty/tan daylight and blue close to the setting Sun, consistent
   with [NASA's Mars sky explanation](https://science.nasa.gov/solar-system/planets/mars/what-does-a-sunrise-sunset-look-like-on-mars/).
   Avoid an Earth-blue daytime sky and the original permanently bright materials.
3. Use opaque pressure modules, compact airlocks, covered service runs and a
   sheltered radiation area; add shielding as a design concept, not a validated
   engineering calculation. Keep crops inside. No lawns, lakes or decorative blue
   ice at this near-equatorial setting. The survey site tests below the ground;
   it does not promise a deposit. [NASA Mars facts](https://science.nasa.gov/mars/facts/)
   are the broad environmental reference.
4. Preserve the game's approximately Mars-strength gravity. Distances, travel
   speeds and time compression remain gameplay choices. More space to explore
   should be accompanied by rover routes, clear landmarks and oxygen return-trip
   planning, rather than just enlarging empty terrain.
5. Before shipping the new base, align the exact hatch/stair position, walkable
   steps, camera collision and interior transition, test every approach direction,
   and rebalance power/supply travel. Current circle colliders are an approximation.

The base is admone's CC BY 4.0 design concept. It is not a NASA-approved Mars
habitat. Keeping that distinction is part of making the game scientifically honest.
