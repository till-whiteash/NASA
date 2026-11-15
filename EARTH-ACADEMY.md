# Earth academy and launch polish

New Mars missions and Moon/Orion routes now start on Earth. Existing surface saves resume normally. New missions require destination-specific hologram lessons, correct quiz answers, console drills and drill quizzes before boarding. There is no training-skip control. Returning to the menu before Mars clearance preserves the existing save.

## Course content

The user supplied 14 SP Course EM0508 files in Space_Tech. All were text-indexed for selection. Five original slide pages are rendered locally, preserving their credits: Topic 1 page 3; Topic 2 pages 9 and 17; Topic 3 page 5; Topic 6 page 16. Narration cites Notes Topic 1 page 2, Notes Topic 2 pages 9–12, and Notes Topic 3 pages 1–2. Mars also uses the Perseverance/Ingenuity slide. This is a selected lesson sequence, not the entire course converted into gameplay.

The hologram displays the original slide, explains it in text and offers optional browser speech. Clicking a slide enlarges it. Wrong answers display an explanation and repeat the question; they do not increment lesson progress. Practical drills also reject unsafe action order and require a correct answer. The greenhouse drill is a supplementary CSA/OSDR-inspired exercise rather than a claim that the supplied notes cover crop production.

One scientific clarification is explicit: orbital weightlessness is shared free fall. The notes' weaker-gravity explanation is not taught as the cause. Reference: https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-microgravity-grades-5-8/

## Graphics and timing

The academy uses five selected NASA GLBs: crew lock bag, orbital replacement unit, infrared camera, habitat demonstration unit and Mark III spacesuit hologram. The player uses the game's existing NASA astronaut rig and walk animation. Props are cached and loaded only when training starts. The 5GB pull archive stays outside the runtime bundle.

SLS launch holds a ground camera for the first four seconds, then blends into tracking. The launcher stays attached to the scene, not the rocket. Rocket parts are cloned so repeat launches do not strip parts from the cached model. Smoke shares geometry, its emission/drag use elapsed time, flame variation is continuous, and reduced motion removes shake. The pad has ground detail and quality-controlled shadows; orbital Earth uses the existing Earth map. Mars construction now begins after ascent rather than during the countdown.

Lunar routes use the same illustrative Earth departure before their existing flyby/descent. The launch is explicitly compressed educational imagery, not a reconstruction of the selected mission. Skip-film controls appear only after training is complete.

The research desk also exposes archived Curiosity RAD surface readings and LRO CRaTER orbital readings, with dates, units and the distinction between lunar orbit and lunar surface. They are not used as live safety forecasts.

## Validation

- `node scripts/test-training-state.mjs`: exercise order, incorrect answers, clearance gates, invalid destinations and source metadata.
- Existing commissioning, story and Mars objective tests pass.
- Browser: Mars lessons and drills completed; wrong answers and wrong action order blocked; boarding created launch only after clearance; Mars world construction remained deferred.
- Browser: Moon lessons/drills reached Earth launch and subsequently lunar descent. A hidden launch-HUD issue found during this check was fixed.
- Browser after fix: Orion lessons/drills reached visible Earth launch controls and transitioned to flyby.
- Browser: launcher world transform stayed fixed while the rocket climbed; two launches retained their cached Orion parts; reduced-motion setting was detected.
- Browser: 390px phone layout had no horizontal overflow; slide enlargement/closing worked. Desktop and phone screenshots inspected.

No frame-rate improvement is claimed without a device benchmark. Existing optional recorded countdown audio is absent and logs a 404; it does not block play. Browser speech availability depends on installed voices. This work is local, uncommitted and not deployed to GitHub Pages.
