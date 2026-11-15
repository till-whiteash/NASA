# Mission radio: optional NASA science note

**Status:** implemented and tested locally, 15 November 2026. This is a separate, optional page. It does not modify mission progress, tutorials, mining, inventory, power simulation or saves.

Open `/game/mission-geometry/` on the existing local game server. Serve the repository over HTTP; opening `index.html` directly as a `file:` URL can block the bundled JSON request. No account, API key, Python installation, GPU or external runtime service is needed to use the page.

## What children do

Move one month slider, or choose a shorter/longer wait. The Earth–Mars gap and approximate radio delay update together. Zhetela explains why a message needs time to arrive. Optional **Why?** and source details keep equations out of the default view. This is not a new quiz, mandatory training stage or mission requirement.

The diagram uses top-down projections of sampled positions. Planets are enlarged so they can be seen. Its dashed line measures separation and is **not** a spacecraft route. The orbit traces connect monthly samples; they are not continuously integrated trajectories.

## Data and provenance

`earth-mars.json` contains 25 monthly snapshots, 1 January 2026 through 1 January 2028 inclusive, at 00:00 TDB. All displayed positions, separations and radio times come from the NASA/JPL snapshots; the browser never substitutes Siderust values.

- Primary source: [NASA/JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html).
- Reference documentation: [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html).
- Bodies: Earth centre `399`, Mars centre `499`; origin Sun centre `10`.
- Result headers identify the ephemeris as **DE441**.
- Frame/plane: J2000 ecliptic with `REF_SYSTEM=ICRF`; vectors in astronomical units.
- Epoch: Julian date TDB, explicitly requested. Dates are not labelled UTC/local time.
- Corrections: `VEC_CORR=NONE`, simultaneous geometric positions.
- Separation is the three-dimensional Euclidean norm of the two position vectors, converted using `1 au = 149,597,870.7 km`.
- Approximate one-way radio time is separation divided by `299,792.458 km/s`.
- API response signature was `1.2` when retrieved; current online docs are labelled `1.3` (the changelog describes documentation of TIME_TYPE). The parser accepts these reviewed versions and checks result headers, epochs, units, target and centre. Other versions require review.
- Exact request parameters, retrieval times and raw responses are in `scripts/mission-geometry/evidence/horizons-{earth,mars}.json`. SHA-256 hashes of these files are recorded in the dataset.

The data is precomputed so children need no network connection to NASA. A fetch failure displays a readable error instead of invented numbers. This is fixed sample data, **not live telemetry**.

### Scope of the calculation

Distance divided by c is an educational estimate. It does not solve the receiver's moving-target light time, solar-conjunction interference, line-of-sight blockage, relay paths, processing delays or human reply time. Doubling the estimate gives only an approximate immediate round trip. A real link might not be available on a particular date.

The shorter/longer buttons find the minimum/maximum **among these 25 samples**. They do not find exact closest approaches. A smaller separation does not identify an optimum launch window. The page does not calculate travel duration, fuel, trajectories, surface illumination, terrain shadows or habitat power generation.

## Siderust assessment

The user supplied [Siderust's Space Apps resource](https://siderust.org/en/space-apps-2026/), [Python package source](https://github.com/Siderust/siderust-py) and [Rust core](https://github.com/Siderust/siderust).

Verified on this Windows laptop with Python 3.12: **siderust 0.9.1** and **tempoch 0.5.1** install using published Windows wheels. The versions differ from the older landing-page examples, so the comparison pins the tested versions.

`siderust-validation.json` records an independent scalar-distance comparison using `Body.Earth/Mars.heliocentric_position(jd)` and `distance_to`. Across all 25 dates, the maximum difference from Horizons was **14.167 km**, below the preselected **10,000 km** tolerance for this educational display. That tolerance is less than the display's 100,000 km increment; it is **not a spacecraft navigation tolerance**. The close agreement is evidence for this narrow date range and quantity, not a validation of every Siderust feature.

The Python `Body` API takes an untagged JulianDate. The comparison supplies the same numerical TDB epoch used by Horizons; it does not independently verify time-scale conversions, frame transformations, lunar orientation, refraction or apparent-position corrections. Siderust's analytical model and JPL's integrated ephemeris remain distinct sources.

**Recommendation:** keep NASA/JPL data as the child's displayed source, and use Siderust as an optional developer-side comparison/calculation tool. It is an independent community project, not an official NASA data source or Space Apps partner. Both Siderust repositories declare **AGPL-3.0**. The package was installed only in a separate validation environment; its binaries and source are not bundled in this web game. Review the upstream licence before distributing an integrated service or library. Do not silently add a browser/runtime dependency.

Useful later: lunar geometric Sun/Earth directions for an optional site-comparison lesson. That would need separate tests, explicit longitude/latitude/orientation conventions, time handling and terrain treatment. Do not use an untested geometric horizon angle as a claim of real sunlight, terrain clearance or guaranteed communications.

## Reproduce

From the repository root (Python 3.12; use an isolated virtual environment if running the optional comparison):

```powershell
python scripts/mission-geometry/build.py --output game/mission-geometry --evidence scripts/mission-geometry/evidence --offline
node scripts/mission-geometry/test-data.mjs
python scripts/mission-geometry/test-parser.py
```

To refresh NASA data, omit `--offline`. Requests are sequential, and responses are validated before caching.

To run Siderust independently:

```powershell
python -m venv "$env:TEMP\zhetalis-geometry-validation"
& "$env:TEMP\zhetalis-geometry-validation\Scripts\python.exe" -m pip install --only-binary=:all: -r scripts/mission-geometry/requirements-validation.txt
& "$env:TEMP\zhetalis-geometry-validation\Scripts\python.exe" scripts/mission-geometry/build.py --output game/mission-geometry --evidence scripts/mission-geometry/evidence --offline --compare-siderust
```

Optional browser evidence (requires Playwright and Edge):

```powershell
python scripts/mission-geometry/browser_check.py --out "$env:TEMP\zhetalis-geometry-evidence"
```

Checks cover complete/finite samples, response provenance, three-dimensional distance and unit consistency, chronological epochs, rejected API errors, radio rounding, keyboard controls, narrower mobile layouts, reduced motion, failed data loads, no external runtime requests and no save writes.

## Integration boundary

This module lives entirely under `game/mission-geometry/` and `scripts/mission-geometry/`. Add only an optional link from mission archive/radio help in the gameplay owner's separate change. Keep the active game in its current tab and use its existing pause/resume lifecycle as appropriate. Do not import the explorer into `main.js`, make it a quest prerequisite or modify any mining or tutorial state.

`../assets/zhetela/standing.png` is the game's existing approved artwork; its source/permissions are tracked by `game/assets/zhetela/provenance.json`. Star twinkles are lightweight SVG/CSS and turn off when reduced motion is requested. The simulation's newer Zhetela animations remain owned by the main gameplay implementation.
