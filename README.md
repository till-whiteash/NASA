# Zhetalis-Nasa
**Play the game:** https://till-whiteash.github.io/NASA/game/ - **Guide for judges:** [game/JUDGES.md](game/JUDGES.md)

**Lite version (for lower-powered PCs):** [Play with low graphics and reduced terrain loading](https://till-whiteash.github.io/NASA/game/?graphics=low&chunks=1)

## Guided first-person construction

Choose **Start on Mars · guided first build** for the short training route.
Leave the pod, open a cargo bundle and assemble its supply rack. Suit air and
the base clock wait until this first build succeeds, then normal survival resumes.
Recover the remaining cargo (six bundles total), calibrate three survey points, clear the site,
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

The **Logbook → Review my decisions** debrief records your first build, power
allocation changes and observed crop problems, with causes, next actions and
retryable reflections saved with the mission. Forecasts are labelled separately
from outcomes. One sol takes **300 seconds** at normal simulation speed.

- [Implementation, science and test guide](game/POWER-TUTORIAL.md)
- [Agent handover and compatibility rules](README-AGENT-HANDOVER.md)
- [Optional mission geometry data and provenance](game/mission-geometry/README.md)

For local play, serve this repository with `python -m http.server 8160`, then open
`http://127.0.0.1:8160/game/`. Use a separate port if 8160 is already in use.

## Lite release — 15 November 2026

Use `game/?graphics=low&chunks=1` on less powerful PCs. Lite uses matching 720p films, no movie look-ahead download, no antialiasing or shadows, and a small static Zhetela portrait instead of 36 large PNG frames. The complete launch and captions are preserved. Guided Start skips the films and begins at the landing pod.

The reviewed inventory, mining, power models, construction, first-build practice and decision debrief are included. Unfinished Earth-return drafts and the still-in-progress cinematic launch revision remain local and are not part of this release.
