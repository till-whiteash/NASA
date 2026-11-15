# Desktop app artwork

Exported from the user's local Zhetela app on 2026-11-15.

- Portrait: `C:/Zhetela/assets/standard-models/standard-upright.png`, using the app's `load_portraits` and `fit_art` functions (including its branded hairpin and feathered crop).
- Idle and speaking: the app's `portrait_motion.render_pose`, sampled over its motion cycle.
- Wave: `standard-wave.png`, using `load_standard_portrait_wave`; only the wrist is deformed as in the app.

192px transparent WebP exports cover the 44–68 CSS pixel guide at high pixel density. The whole set is approximately 1 MB. No AI service or desktop application is required at runtime.

The shared Mars/Moon guide uses idle motion for guidance, a brief wave for success, and speaking motion during voice playback. Dialogue portraits use idle motion. Reduced-motion users receive the static portrait via a picture source.

Re-export on the asset-authoring computer with `python scripts/export-zhetela-app.py game/assets/zhetela-app`. This requires the original local Zhetela app and Pillow.
