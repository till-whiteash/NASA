# Internal Unity model study

This is a local comparison, separate from the production game. It imports the
current checkout's `World` class but does not import `main.js`, run a saved mission,
or write to local storage. Original files in Downloads/UNITY are never edited.
The branded loading screen was committed and pushed separately as `58d32da`.
The model study and imported experimental assets have not been pushed.

From the repository root, prepare the supplied assets:

```powershell
./scripts/prepare-unity-lab.ps1 -Source 'C:\Users\Lenovo\Downloads\UNITY'
node scripts/cross-check-mars-lab.mjs
```

Serve the repository and open `/game/internal/model-lab.html?variant=open`.
Switch between Current, Original, Tuned and Open Exploration. Drag/scroll in
Overview. In Walk mode use WASD, drag to look, Space to jump, V to switch view,
and E to inspect a nearby site or enter/exit the rover. Travel buttons are test
teleports, not a proposed production fast-travel feature. The lab has no full
oxygen, food, farming, mission progression or production interior simulation.

The footprint slider shows how scale changes the design. At the default 34 m
overall footprint, six imported pressure-module bodies are approximately 3 m
across and 2.4 m tall, against the game's 1.85 m astronaut. These are visual fits,
not NASA-engineered dimensions or a claim that the source units are metres.
The complete imported structure, including its mast, is about 4.9 m tall.

Open Exploration removes the original oversized dome/greenhouse/landing props,
retains the rover and terrain, fits circular collision approximations around six
modules, moves the entry target to the first module, and adds fictional survey
sites around 65–140 m from that airlock. It uses a real supplied meteorite mesh
up close and a cheaper silhouette beyond 18 m. It does not establish a real ice
deposit, a real settlement location, or a surveyed reconstruction of Mars.

`unity-model-lab/source` is an untouched copy of the supplied glTF, binary and
textures. `tuned` removes the oversized export terrain nodes, packs only retained
attributes, reduces textures to 512 px, and converts unlit materials to lit,
rough surfaces. `asset-stats.json` records the changes. The raw STL terrain and
83 MB FBX were inspected but not substituted for the existing NASA-derived
heightfield: doing that would need coordinated terrain and walking-physics work.

Credit: this work is based on [“Mars One” Mission – Base](https://sketchfab.com/3d-models/mars-one-mission-base-83ced347037f47aba8473147d65df074)
by [admone](https://sketchfab.com/admone), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changes: terrain removal,
geometry repacking, texture reduction, material conversion, and gameplay fitting.
The original licence is retained beside the copied model.

Read [COMPARISON.md](COMPARISON.md) for the recommendation and measured limitations.
