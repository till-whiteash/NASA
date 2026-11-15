# Articulated Z-2 gameplay source

`astro_kit.py` and `common.py` are snapshots of Claude's animation helpers from
the mission-film worktree, reused here for the same Z-2 mesh, joint positions and
capsule skin weights. They are build-time source; the browser loads the exported GLB.

NASA source: https://science.nasa.gov/3d-resources/z2-spacesuit/
Credit: NASA / LaRC / Advanced Concepts Lab.

Rebuild in Blender 5.3 through the Blender MCP headless script/job tool:

```python
import runpy
runpy.run_path(r'C:/NASA/Zhetalis-Nasa/scripts/build-z2-gameplay.py')
```

The builder resolves project paths from its own location. It reads
`game/assets/models/nasa-spacesuits/z2-suit-web.glb` and writes `z2-gameplay.glb`
and its action manifest beside it. The nine actions are in place: gameplay
physics controls travel and jumping. Mars, Moon, the stored suit and mirror use
the shared loader in `game/src/z2-suit.js`.

The mirror's cabin-clothed character uses a separate `player-cabin.glb` model
with its own animation mixer, using a customized Ch48 variant rather than
Director Hale's Ch23 model. Its idle/walk clips use the shared crew rig data.
See `game/assets/crew/player-cabin.source.json` for provenance.
