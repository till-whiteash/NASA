# Junior Astronaut: Mars Outpost — guide for judges

Team Zhetalis · NASA Space Apps Challenge 2026 · Build a Junior Astronaut Mission Trainer

**Play:** https://till-whiteash.github.io/NASA/game/
**Lower-powered computers:** https://till-whiteash.github.io/NASA/game/?graphics=low&chunks=1

Browser game with keyboard/mouse and phone/tablet controls. The Mars mission combines first-person construction, life-support decisions and sourced science. The title screen also offers Moon flybys and surface training. This guide describes the current implementation, not a promise of future features.

## A five-minute first-play demonstration

Loading time depends on the connection and hardware. This is a suggested route, not a requirement to finish an entire habitat in five minutes.

1. Choose **Start on Mars · guided first build**. It loads the Gusev training landscape and starts inside the landing pod. **Launch to Mars** retains the optional full briefing and flight route; the Field manual also offers film replays.
2. Read the single current objective. The suit is already checked. Walk to the hatch marker, aim and press **E / Action**, wait for pressure to match, then use the outer hatch. Keyboard: WASD to walk, drag/click the view to look, Esc to release the mouse. Touch: left thumb moves, right thumb looks.
3. Follow the marker to an orange cargo bundle and use it. Then follow the green rack marker beside cargo 1 and use it to **assemble the supply rack**. The rack becomes a physical object and the game records the completed action. It reuses its own packing frame, without spending habitat materials.
4. Until that first build is complete, **practice mode pauses suit-air consumption and the base clock**. The HUD says so. Afterwards normal time and survival rules apply; return to the pod to refill suit air. The pause is a training aid, not a claim about real EVA safety.
5. Open **Logbook (L) → Review my decisions**. The first build appears with what you did, its result, and a question about why the material budget stayed unchanged. Wrong answers receive an explanation and can be retried.

The next objectives lead through six cargo bundles, three survey checks, four site rocks, six frames, pressure shells, airlocks and a pressure check. **Left click / Mine** breaks rocks with the pickaxe; **E / Inspect** examines them without damage. One objective and its world marker show the next action; deeper explanations sit under **Why?** or **How do I do this?**

## A later-game learning demonstration

Use normal progression or an explicitly labelled prepared save; do not imply the advanced base is the starting experience.

- At the power console, change the life-support/science allocation. The forecast immediately shows oxygen after crew demand, science output and the Earth link. A completed slider change records its before/after values in the mission debrief.
- Observe crop growth at a sol boundary. Too little allocated power pauses growth; too little water pauses that bed. Cold conditions halve otherwise-powered, watered growth. The game explains the applicable cause and offers a next action.
- Inspect the night-storage explanation. The simulation compares **battery capacity** against the fixed night-heater requirement. It does not track a detailed battery state-of-charge curve. Extra wired storage helps a capacity shortfall; it does not create electricity. Moving the science slider does not change the fixed heater requirement.
- Open **Quest log (T) → Mission debrief · my decisions** or the logbook. Review actual recorded decisions and outcomes. Reflection questions ask which evidence supports a diagnosis and what intervention addresses it. The journal survives save/reload and retains the latest 18 entries. Forecasts are labelled as predictions, not observed successes.
- The existing sourced fact library and badge quiz remain available. They complement the decision debrief rather than serving as the only evidence of learning.

## What the game implements

| Area | Current behaviour |
|---|---|
| Starting experience | First-person landing pod; checked suit; guided cargo/rack practice; habitat must then be built and pressurised. Older saves retain their progress. |
| Construction | Player-operated salvage, surveys, site clearing, frames, shells, airlocks and pressure check. Fixed engineered footprints align doors and tunnels; this is not arbitrary structural engineering. |
| Power | Print/assemble teaching kits, complete circuit exercises, wire the field solar/battery/base system. Extra batteries require placement, inspection and polarity-matched connections before capacity is credited. |
| Food and water | Process ice, check water, supply grow beds, harvest and prepare meals. Electricity alone does not create stored meals. Ice processing does not directly refill cabin oxygen in this implementation. |
| Trade-offs | Life support, communications, science and shelter equipment share the power budget. Solar output depends on connection, cleanliness, storm conditions and faults. |
| Radiation | Passive habitat, water and supported-regolith shielding reduce exposure. Shelter equipment needs electricity; there is no electrical radiation force field. Exposure and thresholds are simplified training rules. |
| Progress and failure | Survive the selected mission duration or meet the settlement conditions. Oxygen/food/radiation failures and exhausted EVA air have consequences. Practice protection ends after the starter rack. |
| Learning | Action-based milestones, forecasts, recorded cause/result explanations, retryable decision reflections, sourced logbook and fact quiz. Opening help or watching a film does not complete construction. |

## Timing and classroom use

- `TUNED.solSeconds` is **300 seconds per sol** at normal speed: five minutes of active simulation. Speed ×3 makes it 100 seconds. Menus that pause play, cinematics and starter practice do not count as active simulation time.
- Mission presets are **Cadet: 60 sols / 2 crew**, **Explorer: 120 / 3**, and **Commander: 240 / 4**. These are long-running saved missions, not five-minute or single-lesson completion claims.
- For a short lesson, stop after the first build, a completed habitat stage, or one power decision and its reflection. Resume the same browser save next time.
- Six quick-tool slots; **1–6** equips, **Q** puts a tool away, **I** opens the backpack, **B** opens Builder, **T** opens the quest log and **L** opens the logbook. Touch controls provide corresponding actions.
- No game account is required. Progress is stored locally in the browser. NASA/CDN/network requests still need a connection; optional co-op also uses a relay. Do not describe external requests as “no network” or “no tracking guaranteed.”

## Science, sources and limits

The walkable terrain uses Gusev data even when the full arrival route selects another resource region. Resources, distances, construction costs, suit-air duration, growth rates and hazard strengths are compressed teaching rules. The in-game year/story is fictional.

NASA/NOAA sources include GOES space-weather feeds, DONKI events, Perseverance imagery, Curiosity weather, EPIC Earth images, JPL planetary/geometry references and NASA model/terrain assets. Availability and freshness vary. Read each displayed **LIVE / ARCHIVED / source date** rather than assuming “today” or that an Earth/ISS measurement is a live measurement at the simulated Mars base.

The optional Earth–Mars radio-delay explorer uses dated NASA Horizons snapshots with provenance checks; it is not live spacecraft navigation. OSDR, RadLab and CSA resources support research and discussion, not a validated operating manual for a real habitat. NASA source use does not imply NASA endorsement.

## Reviewer checks

- A new guided mission reaches a visible rack build through actual controls; time/air resume afterwards.
- Cargo, construction, inventory and reflection answers survive save/reload without duplicate credit.
- A power change shows its before/after forecast. A crop explanation agrees with the simulation's power/water/cold checks.
- The decision debrief contains only this mission's recorded actions/outcomes. Fact recall is separate.
- Optional films can be skipped and do not spend materials or complete construction tasks.

For diagnostics only, `#debug` exposes `window.game`; console changes are test setups, not earned player progress. See `POWER-TUTORIAL.md` and the regression scripts for implementation checks.
