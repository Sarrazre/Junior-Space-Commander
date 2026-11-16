# Greenhouse rescue implementation — 15 November 2026

## Implemented

- Replaced the exported Sol 3 greenhouse activity with an evidence-based rescue sequence. The older regolith lesson remains private in `botany.js` for future reuse; other botany mini-games are unchanged.
- The player brings the generated transparent lettuce specimen to an observation dock, examines leaves, water supply and light, chooses a hypothesis, reconnects irrigation, and verifies the outcome against an unchanged reference plant.
- Specimen and tools support mouse/pen/touch dragging with pointer capture and a lifted preview. Native item/destination buttons provide click-to-place and keyboard alternatives. Invalid drops return to the bench with an explanatory message.
- Progress steps, descriptive plant states, live feedback, visible focus, mobile layouts and reduced-motion styling are included. Exploration and revised hypotheses do not count as mistakes; the final inference question uses existing mastery scoring.
- Recovery uses the shared pause-aware task clock. The time-lapse is explicitly a teaching model, not instantaneous plant growth or NASA measurement. All global task rewards and persistent world flags remain the parent mission controller's responsibility.
- Copied the existing generated transparent asset into `public/assets/greenhouse/lettuce-pod.png`; provenance and original prompt are recorded beside it. The generated image is unchanged; CSS provides the stressed state.

## Integration contract

`greenhouseRescue(body, params, api)` uses `api.ok`, `api.miss`, `api.every`, `api.cancelTimer`, `api.onCleanup` and `api.finish`. It does not read or mutate persistent game state. Sol 3 should gate this task on Max's repaired upstream pipes, and can set `greenhouseRestored` after accepted completion. The fictional local tray connector is the remaining fault after the main pipes are restored.

## Verification

`node --check` passes for both changed JavaScript files; `git diff --check` passes. Initial full-build attempt encountered an unrelated in-progress `src/main.js` import of missing `polish.css`; final integrated build should be rerun once all parallel work is present. Browser/touch-device validation has not been performed by this specialist.

Suggested browser path: test specimen drag and click-to-place separately; inspect all three clues; revise an incorrect hypothesis; try the wrong tool; connect water; pause during time-lapse; resume and select the evidence-based conclusion; record discovery; leave/re-enter at each stage; verify no delayed completion after exit. Check a narrow viewport and reduced motion.
