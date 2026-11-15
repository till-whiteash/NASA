# Animation and performance audit — 15 November 2026

This pass reviewed the mission animation code, published film inventory, relevant Git history, and the animation, multiplayer and construction chats. It preserves the existing launch/Kármán-line/orbit sequence and player-led base construction.

## Changes

- Pause the hidden main renderer during every full-screen movie, loading-film loop and walkable briefing room, including movies opened without a world argument. Drain the frame clock so gameplay resumes without a large time step.
- Resize the briefing renderer only when the viewport changes. Low graphics uses at most 960×540 pixels without antialiasing; other modes cap at 1920×1080. Cancel late crew attachment and release cloned crew resources on exit.
- Release launch-owned geometry, materials and textures on arrival. Clone rocket parts and modified materials instead of detaching or changing the cached NASA models. Ignore asset loads that finish after launch disposal.
- Seek preloaded repair films even when their metadata has already loaded. Reuse the preloaded looping movie without resetting its source, and make loop cleanup safe to call twice.
- Stop preloading the old base-building movie after arrival, since building is now interactive.
- Reduce live dust-storm sprites from 320 to 96/160/240 for low/balanced/high graphics and grit from 2,200 to 600/1,200. Prewarm its shaders, suspend gameplay physics during the scene, cap its pixel budget, and dispose its grit material.
- Bound live-cutscene time steps after stalls/backgrounding to avoid skipping across the landing or storm. Preserve camera, visibility and renderer state on skip.
- Centralize cinematic imports in the import map and update module versions so the renderer and overlays share one playback state after deployment.
- Preserve the exact NASA Orion source bytes on Windows; automatic CRLF conversion previously broke its provenance checksum test.

## Validation

- All 41 existing Node test files passed, covering Mars/Moon objectives, construction, mining support, co-op/night voting, rover terrain/contact, device profiles, resource loading and source provenance.
- All 15 published movies started, decoded frames and released their decoder/source after skipping. These are playback smoke checks, not full-film frame-rate benchmarks.
- Browser regressions cover an already-preloaded repair clip, idempotent loading-loop cleanup, failed-film cleanup, phone captions and two complete launch replays with an intact model cache.
- The low-memory mission was exercised from the title through briefing, launch film, arrival, live landing and habitat. It produced no JavaScript errors. The hidden main renderer made zero render calls during movies and resumed afterwards.
- Three storm replays and three landing replays left stable geometry/texture counts. Gameplay physics did not run during those scenes. The isolated low-quality storm stayed within 97 draw calls.
- Existing mining/construction and cabin-exit browser regressions passed. Four cabin rotations permit a visitor to leave at night; building rocks accept the required hits and construction advances.
- Sampled five frames from each of the 15 published films, inspected the briefing/landing/habitat in the browser, and inspected 12 authored Blender scenes. The rover/panel shot has more than nine metres of separation in the authored scene. Habitat overlap reports were ceiling/support joints, not furniture blocking a walkway.

## Remaining limits

- Eight published films are 1080p; seven still use the existing 540p exports. The unfinished HD film changes in the animation worktree are separate from this release. In particular, no new solar-panel or air-leak HD file exists to publish. Those render sources also contain pending camera-cut corrections.
- Browser checks used local Microsoft Edge. They do not reproduce every affected PC, GPU driver, network connection or long play session. Resource cleanup and lower rendering load address concrete crash risks, but this audit cannot certify that every reported browser-tab crash is resolved.
- Visual sampling and scene bounds can identify obvious clipping; they are not an exhaustive frame-by-frame review of every film or every possible gameplay pose.

## Repeat the browser checks

Install Python Playwright and Microsoft Edge. The scripts start temporary local servers and use the game's existing Three.js import map/CDN. Run from the repository root:

```sh
python scripts/test-cinematics-browser.py
python scripts/test-cutscene-lifecycle-browser.py
python scripts/test-animation-flow-browser.py
```

The last command accepts an optional screenshot directory. The historical cinematic test now checks actual MP4 playback instead of waiting for the removed GLB movie canvas.
