# Zhetalis-Nasa
**Play the game:** https://till-whiteash.github.io/NASA/game/ - **Guide for judges:** [game/JUDGES.md](game/JUDGES.md)

**Lite version (for lower-powered PCs):** [Play with low graphics and reduced terrain loading](https://till-whiteash.github.io/NASA/game/?graphics=low&chunks=1)

## Guided first-person construction

The game includes a guided landing-pod-to-habitat mission. Leave the
pod, recover six cargo bundles, calibrate three survey points, clear the site,
raise six frames, fit shells and airlocks, and check pressure. The player chooses
the module build order on engineered footprints. Existing greenhouse expansion
still uses Builder placement.

The next objective stays visible, with one action, a world marker and E / Action.
Optional **Why am I doing this?** and the **Field manual** explain the science.
The manual reuses authored films without completing the player's tasks. Its
mission archive also links to the optional Earth-Mars radio-delay explorer in a
separate tab. Zhetela uses the app's upper-body portrait framing, wave and stars.

Build the power equipment at the printer/workbench, then wire the actual field
terminals: solar/controller, battery, base and rover charger. An extra battery
must be placed, inspected and wired in parallel before it adds storage. Both
sets of tutorial stones and mineral mining remain available. Old saves retain
progress. Publishing to `main` updates the GitHub Pages site.

- [Implementation, science and test guide](game/POWER-TUTORIAL.md)
- [Agent handover and compatibility rules](README-AGENT-HANDOVER.md)
- [Optional mission geometry data and provenance](game/mission-geometry/README.md)

For local play, serve this repository with `python -m http.server 8160`, then open
`http://127.0.0.1:8160/game/`. Use a separate port if 8160 is already in use.
