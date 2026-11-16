# Rover lifecycle implementation

Implemented in `src/rover.js`, `src/minigames/index.js`, `src/minigames/sites.js`, and `src/minigames/expedition.js`.

## Changes

- Rover and Three.js load on demand, with a preparation indicator. Restart/quit invalidates a pending import so it cannot launch into a later mission. Import errors restore base visibility and show a retry message.
- WebGL initialization failure shows Retry / Back to base and **Instrument mission (no 3D)**. Instrument mode runs the same sample or expedition experiments sequentially, respects the chosen route's stop count, and returns the same completion/mistake result. It requires no network data or WebGL after the application code is loaded. It does not add a service worker or guarantee first-time offline loading.
- Rover site tasks own pause-aware clocks and cancel pending completion callbacks on normal return, early rover exit, and global mission abort. Success and cancellation are idempotent. Terminal shell preserves the parent's clock work and also guards paused input and stale success/error callbacks.
- Rover footsteps use active game time. Camera/docking effects use elapsed active time, so pausing or hiding the tab does not skip those sequences. Held keys clear on blur and visibility changes.
- Completed markers stay attached but hidden, making them available to teardown. Teardown deduplicates geometry, material and texture disposal (including shader texture uniforms), disposes shadow resources, releases the WebGL context, clears clocks/listeners, and drops debug references. Cancelling an astronaut walk releases its continuation, which checks the mission has not ended before proceeding.
- `G.lowGraphics` caps rover pixel density at 1 and disables antialiasing and shadows for the next trip. `G.reducedMotion` suppresses camera shake and speed-driven FOV changes, with OS preference fallback when unset.
- Panorama dragging handles pointer cancellation/lost capture, and extra photo clicks after the last target no longer create mistakes during the completion delay.

## Validation

- Production build passes. Current initial JS: **1,392.94 kB / 393.32 kB gzip**; deferred rover chunk: **612.43 kB / 158.75 kB gzip**. Original initial JS was 1,994.95 kB / 547.78 kB gzip. Other parallel changes are included in the current build; the deferred chunk provides direct evidence that rover code is no longer initial payload.
- `node --check` passes for all four edited JavaScript files; `git diff --check` passes.
- Three existing active-clock tests pass (pause preserves remaining cue time, cancellation removes delayed/repeating work, callbacks safely cancel work). The full test file initially had an unrelated resource-start-value assertion failure; parent notified to update its saturation setup for the new balance values.
- Parent integration pass requested to verify rover entry, a site, early exit/restart, and WebGL recovery interactively. This implementation report does not claim those browser checks or a measured FPS/memory improvement.

## Save integration review and follow-up validation

Added `tests/save.test.js` with seven meaningful checks: restore without replaying storm/sickness costs, completion retention for conditional late-panel cleanup, idempotent end-of-sol processing before/after restore, unavailable/corrupt storage, stale-tab conflict rejection, null-entry corruption, and inconsistent phases/science caps. Initial corruption failures were reported to the parent and fixed in its state validation. Test histories now advance through prior sols, matching the strengthened chronological-log invariant.

Final combined run: **11/11 save and clock tests pass**. Production build and whitespace validation also pass. With the parallel feature work and instrument fallback, current build is 1,413.17 kB initial JS (400.57 kB gzip), plus deferred rover 613.62 kB (159.10 kB gzip). Browser integration remains the parent's verification scope.

## Integration note

Terminal/rover aborts now return a cancelled result. Parent mission orchestration must check its session generation after awaits, including enclosing command-center/medical-bay loops, so cancelled tasks cannot reopen an old dashboard. This requirement was sent to the parent during implementation.
