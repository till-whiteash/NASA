# NASA spacesuit downloads and PNG previews
## Articulated gameplay Z-2

`z2-gameplay.glb` is the gameplay derivative of Claude's articulated Z-2 suit,
with capsule skin weights and nine named in-place actions: Idle, Walk, Run,
Jump, Dig, Carry, Repair, Crouch and Kneel. The shared loader serves Mars, Moon,
the habitat suit rack and the mirror. Storing the suit shows the separate
cabin-clothed player avatar in the working full-length mirror.

Build source and provenance: `source-assets/blender/z2-gameplay/README.md`.
Builder: `scripts/build-z2-gameplay.py` (run inside Blender, including via MCP).
Browser checks: `scripts/test-suit-mirror-browser.py` and
`scripts/test-suit-game-flow.py` cover model loading, independent skeletons,
walk blending, Moon reuse, reflected-body camera layers, rack state and saved
EVA state. Airlock and commissioning checks remain in their existing tests.

## Original reference downloads
Downloaded 2026-11-15 from NASA 3D Resources. PNGs rendered locally in Blender 5.3, using the downloaded models and their materials. Each model includes front, three-quarter and back PNGs, original GLB, and preview Blender scene. These are preview assets; rigging has not been validated.

Astronaut: https://science.nasa.gov/3d-resources/astronaut/
Source credit listed by NASA: DigitalSpace Corporation.
Z2: https://science.nasa.gov/3d-resources/z2-spacesuit/
Source credit listed by NASA: NASA/LaRC/Advanced Concepts Lab.

## User-supplied reference sources
- NASA APIs: https://api.nasa.gov/
- Space weather / DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/
- Open Science Data Repository: https://osdr.nasa.gov/bio/repo/
- RadLab data API: https://visualization.osdr.nasa.gov/radlab/gui/data-api/
- Mars Trek: https://trek.nasa.gov/mars/
- CSA STEM resources: https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp
- CSA food-production toolkit: https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/

Duplicate OSDR link removed; concatenated DONKI/Mars Trek link separated above. These reference links were reviewed, not integrated into the game. Actual suit geometry comes from the NASA 3D Resources pages above.
