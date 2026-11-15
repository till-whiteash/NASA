# Survival and ISRU progression

Outdoor suit oxygen reaching zero ends the current run. The mission save is deleted immediately; autosave cannot restore it. Retry starts a new mission, while Main Menu returns to the title screen. There is no respawn. Graphics/audio preferences and account-wide patch collections remain separate from run progress. In co-op the dead player leaves the room; surviving players continue. A guest's separate solo save is not deleted.

The ISRU yard starts empty, including its collision geometry. Finish the habitat, permanent power connection, relay commissioning and first food harvest to unlock it. Follow the objective marker and press E / Action:

1. Survey the site.
2. Equip the builder and lay the landed foundation kit.
3. Install the processing machinery.
4. Connect the protected feed at the base power outlet.
5. Return to the yard and commission the plant.

The completed, base-connected plant increases powered oxygen production by 30%. Construction progress is saved and shared through the existing co-op mission state. The small habitat water plant remains available for the first harvest.

Low graphics retains antialiasing while limiting the rendered pixel count. Greenhouse display copies release their own merged geometry when replaced. Hidden tabs pause rendering. A lost WebGL context stops controls, attempts to save the mission, and offers a restart with low graphics; a browser/OS process termination cannot be recovered inside the page.

## Verification

- `node scripts/test-survival-isru.mjs`
- `python scripts/test-survival-isru-browser.py` (Playwright with Edge)

The browser test covers construction stages, reload persistence, stable geometry counts across repeated greenhouse refreshes, shelter aisle clearance, forced context loss and recovery, permanent oxygen death, Escape, autosave, Main Menu and Retry. Desktop low-quality shelter and before/after ISRU views were also inspected visually.
