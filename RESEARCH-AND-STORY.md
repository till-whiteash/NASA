# Zhetalis: NASA resources and mission direction

Research reviewed 13 November 2026. Recommendations below are game-design proposals, distinct from agency findings.

## Recommended direction

Keep the survival/building sandbox as the core. Add option 3 (a silent rover) as the investigation hook, then option 2 (a fictional biological discovery) as the ethical climax. A dust-blinded navigation camera and protective safe stop explain the rover without immediately implying alien sabotage. The mystery becomes interesting when its sealed sample archive contains an unexplained signal.

The player should test an alternative explanation, compare a sterile blank and an Earth-contamination control, repeat a measurement, and investigate whether the outpost is damaging the site. A possible biological signal is different from confirmed life, and neither establishes danger to humans. Clearly identify the eventual alien-life finding as fictional. Send evidence to Earth; retain sealed samples pending a return/containment plan.

Offer preservation, a withdrawal recommendation, and continued development, with consequences rather than one simplistic morality score. The implemented endings are narrative records; the sandbox remains playable as training replay. A real departure cinematic, permanent development restrictions and world-state ecological changes are future work.

Option 4 is better as a later diplomacy chapter. No supplied resource establishes a miraculous Martian energy material. A more grounded competition could concern accessible water ice, power infrastructure, logistics or a scientifically valuable site. If a new material is retained, label it speculative. Avoid implying a settled universal rule about ownership of extracted resources. The [Outer Space Treaty](https://www.unoosa.org/pdf/publications/st_space_61E.pdf) provides useful discussion of non-appropriation, cooperation, harmful contamination and consultation; it is not a complete mining-rule simulator.

## Resource decisions

| Priority | Resource | Best use | Integration and limits |
|---|---|---|---|
| 1 | [CSA food toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/) | Greenhouse decisions and classroom learning | Curated teaching material, not a feed. Food, preparation, water, energy and crop time should be separate constraints. |
| 2 | [DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Solar-event history and storm preparation | Download bounded FLR/SEP windows. Retain event identifiers, dates and original links. Research information, not operational Mars forecasts. |
| 3 | [Mars Trek](https://trek.nasa.gov/mars/) | Landing-region comparisons and terrain context | Preserve existing terrain integration; add site-specific layers only with correct coordinates and provenance. |
| 4 | [OSDR](https://osdr.nasa.gov/bio/repo/) | Evidence-based plant and microbe research | Select a few studies with readable questions and controls instead of bulk raw omics downloads. |
| 5 | [RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | Radiation observation lessons | Named instruments and bounded intervals; retain measurement units and environment. |
| 6 | [CSA STEM directory](https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp) | Educator mode and optional activities | A directory of resources rather than runtime data. Review individual media permissions before reuse. |
| 7 | [NASA API portal](https://api.nasa.gov/) | Discover services and authentication | Choose services by gameplay need. Do not make launch depend on several remote APIs succeeding. |

The duplicated OSDR link is represented once.

### Food and biology

[Interplanetary Farming](https://www.asc-csa.gc.ca/eng/youth-educators/activities/fitness-and-nutrition/interplanetary-farming.asp) supports decisions about nutritional roles, growing time and preparation. Suggested mission: select a menu, reserve packaged food, prepare clean water, grow a crop under controlled conditions, inspect the harvest, and explain what the crop does not supply. Real crop durations must not be confused with accelerated game timers. This is an educational model, not a dietary prescription.

[OSD-37](https://osdr.nasa.gov/bio/repo/data/studies/OSD-37/) is a useful concrete accession for a spaceflight/ground plant comparison. The importer downloads its metadata, not sequence reads. Metadata helps identify the experiment; a defensible claim about a biological effect additionally needs its publication, design, controls, analysis and limitations. OSDR data concerns terrestrial life studied under space-related conditions, not discovered Martian organisms. NASA also offers a [new biological data API](https://www.nasa.gov/osdr-api/) for broader filtered exploration.

### Radiation and solar events

DONKI's official host migrated in September 2026. The existing game's old hostname has been updated. The new research importer requests the bounded 10–11 May 2024 flare interval as historical teaching material. Retain the established NOAA fallback. A real source event can inspire a fictional hazard, but travel times, intensity at Mars and shielding outcomes require further modelling. Do not map Earth's geomagnetic Kp directly to Mars surface danger. Cite the event data and acknowledge CCMC and the contributing analysis team; follow its published rules of the road for research/publication.

The [RadLab API documentation](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) defines a GET interface with filters, selectable fields and output formats. Its JSON response observed during this task contains `columns`, `index` and `data`; the importer converts rows into named fields. The selected example is ISS DosTel observations from 23:00–23:10 UTC on 1 April 2022. It is a historical instrument-comparison example, not Mars calibration. Absorbed dose rate (µGy/hour) is distinct from dose-equivalent rate (µSv/hour); no conversion factor is invented.

### Maps and assets

[Mars Trek WMTS documentation](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) describes tiled imagery and layer metadata, including differing projections and coverage. Inspect GetCapabilities before forming tile URLs. A shaded-relief picture is not a digital elevation model. The existing game uses Gusev terrain even for other selected regions; keep that disclosure until each region has its own properly projected elevation and imagery. Stream or cache a bounded resolution instead of downloading a planet at maximum resolution. Check credit and reuse requirements for each layer.

### Planetary protection

NASA's [Mars sample-return safety material](https://www.nasa.gov/wp-content/uploads/2023/10/508-msr-peis-factsheet-5a-msr-safety-110222.pdf) distinguishes scientific uncertainty from containment precautions. Use that distinction in dialogue: unknown does not mean deadly, but sample handling still matters. Do not casually reward shipping a fictional harmful organism to Earth.

## Implementation in this update

- Mission objectives (T) now opens **The silent rover** and **NASA & CSA research desk**.
- Habitat commissioning adds finite landed kits, timed exterior work and an entry gate; old saves remain compatible.
- Three ordered crew assignments consume one salvaged part each, take training time, pause without power/life-support allocation, and persist in the existing save.
- Three final recommendations are recorded with a confirmation screen; a chosen ending cannot be repeatedly changed for rewards.
- The research desk shows all seven unique sources, limitations, snapshot timestamps, sample observations and links to the saved records. The shared Information library gains corresponding articles.
- Arrival briefing and food-lab explanation connect the research to the existing mission.
- `node scripts/snapshot-research.mjs` downloads the three bounded datasets. It validates responses, stores provenance, uses atomic file replacement, and retains a previous successful snapshot on refresh failure. It never substitutes fabricated observations.
- `node scripts/test-story-state.mjs` verifies prerequisites, costs, assignment order, power pauses, save/resume and endings.

## Remaining storyline work

New Mars games now start with uncommissioned pre-positioned habitat shells. Enter the lander to collect three finite kit units, then use the habitat entrance to assemble/seal fittings, install filtration/purge, and pressure-test/verify breathable air. Each stage takes surface work time near the entrance; the last two consume stored oxygen. Ship refuge remains accessible while habitat and greenhouse entry stay locked. Older saves without commissioning state retain access. This is commissioning landed shells, not a voxel-style construction system or new pod geometry.

The opening still uses the existing mining/building tutorial after commissioning. A fully empty landing site with player-designed pod geometry, new cutscenes and physically simulated gas composition would be a larger subsequent scenario. The current checks and gas amounts are explicitly training rules.

Crew tasks in this update are mission-board simulations, not new NPC navigation animations. The rover mystery is a text-based investigation, not a new disappearing world object. No new moon beyond the existing lunar experience, alien-energy economy, or live Mars radiation predictor is implemented. These distinctions should remain explicit in team demos.

## UI and verification approach

Reuse the existing modal, typography, source links, Escape dismissal and focus handling. The screen answers: what can the crew investigate next, and what evidence supports the lesson? No new dashboard shell or chart is needed. Inspect the desk and investigation at desktop, tablet and phone widths, including keyboard access, scroll and missing-data states. Keep source text escaped before inserting it into HTML.
