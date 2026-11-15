# Player cabin character

The player uses `player-cabin.glb`, a player-only variant of the existing
Mixamo Ch48 flight-suit character. Director Hale uses Ch23. The player variant
has narrower, slightly longer head proportions and darker hair; the crew's
original assets are unchanged.

Source: `source-assets/crew/Ch48_nonPBR.fbx`, through `ch48.glb`.
Source and output SHA-256 hashes are in `player-cabin.source.json`.
Rebuild with `python scripts/build-player-cabin.py`, or run that script through
Blender MCP. It edits the GLB document while preserving the source's compressed
mesh and original rest-bone axes.

The mirror binds the shared Mixamo idle animation and a reduced-stride walking
variant to the player's skeleton, with smooth movement blending. The reflected
body uses its own mixer and does not control any crew character.
