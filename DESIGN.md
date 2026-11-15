# Zhetalis Flight Academy UI
The user delegated design decisions for a substantial redesign. Preserve free exploration, sourced lessons, quiz correctness gates and NASA assets.
## Visual system
Flight navy #101e3b frames the destination globe. Training uses white #f5f7fb instrument panels against the 3D room, ink #162b50 and action blue #244cba. Amber feedback explains retries; green confirms correct answers. Barlow Condensed Semibold is self-hosted for display, Poppins remains the existing body face. The font is from google/fonts, licensed under the bundled OFL.
## Layout and interaction
Mission menu: large training-first headline, separate difficulty selection and destination actions, NASA globe in its own viewing field. Training: floating status bar, drill sequence, compact right briefing panel, expandable playback controls, centered subtitles. Quiz state explicitly reveals the question and explanation. Mobile moves the task panel below the world with scrollable content and touch movement controls. Focus rings and reduced-motion rules remain explicit.
## Provenance
Installed anthropics/skills frontend-design as anthropic-frontend-design. Used existing frontend-design and Impeccable craft guidance. No new JS UI framework is required. Original NASA and course assets remain credited separately.

## Verification
Reviewed desktop 1440x900 and phone 390x844 renders. Browser checks confirmed movement during briefing, disabled remote answers, visible quiz questions and same-question explanatory retry. Training-state suite and whitespace checks pass. Mechanical design detector reported no findings. Feedback is placed before answers for phone reading order.


User revision: Earth academy removed from all playable mission entry paths. New Mars, lunar flyby and lunar surface missions start with launch directly. No preflight hologram, slide viewer, quizzes or drills. Existing surface gameplay and save/resume remain.
