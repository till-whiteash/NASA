# Backpack and rock controls

These changes extend the guided tutorial in `feature/circuit-tutorial`. They preserve the existing ore locations, mined-rock IDs, mission progression and saved quantities.

## Playing

- Equip the pickaxe and aim at a nearby rock. **Left click** mines; **E** inspects without damaging it. Let each swing finish before clicking again. On touch screens, use the separate **Mine** and **Inspect** buttons.
- E still places parts, connects wires and uses stations.
- Press **I** or click the backpack on the toolbar to inspect your inventory.
- Press **1–6** to equip a quick tool. Press its number again, or **Q**, for empty hands.
- The backpack has **24 sample slots**, with **64 matching samples per stack**. Tools have six separate quick slots. Mission cargo is shown separately and uses its existing mission state.
- At the base locker, select an item to transfer one sample or a stack. **Store all samples** empties the sample backpack into base storage. Opening the locker no longer unloads automatically.
- The base locker can be viewed from the backpack, but transfers require using the physical locker. Builders spend stored minerals.

## Implementation

`inventory-state.js` handles stack capacity and conservative transfers; the existing aggregate ore counts remain the save format. Older over-capacity saves keep their quantities. `inventory.js`, `inventory-icons.js` and `inventory.css` provide the item grid, search, descriptions and controls.

The primary action ray selects the aimed mineral independently of the nearest station label. Construction rock mining has its own primary action, while inspection is routed through E. Removed rocks and stale impact targets are rejected. A full backpack cannot destroy a mineral deposit and lose its yield.

## Validation

Run from this checkout:

```powershell
node scripts/test-inventory.mjs
node scripts/test-player-tutorial.mjs
node scripts/test-habitat-build.mjs
node scripts/test-mars-objectives.mjs
python scripts/test-inventory-browser.py --out <evidence-folder>
python scripts/test-mining-input-browser.py --out <evidence-folder>
```

The browser tests use the actual game UI and input handlers. Inventory coverage includes explicit unloading, stack/single transfers, search, remote transfer blocking, phone layout and save/reload. Mining coverage includes habitat rocks, power-site rocks and mineral deposits, plus rejected removed targets and separate touch actions. Debug positioning makes the checks deterministic; the tests do not write to the player's browser profile.
