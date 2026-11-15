# Final menu/audio integration review

Read-only source review, 2026-11-15. No browser or listening test performed. No source edits. Findings use current line positions and concrete event ordering.

## Findings

### Resolution verification

All five findings below were re-read after the parent agent's fixes and are **RESOLVED by source inspection**:

| Finding | Resolution verified |
|---|---|
| 1 — Intro native buttons | `landing.js` returns for Enter/Space originating from button/link/input controls before intro navigation handling. Back and Skip retain native activation. |
| 2 — Controls disclosure | `ui.js` focus-trap selector now includes `summary`; disabled inputs/selects are excluded. |
| 3 — M on focused pause buttons | `main.js` handles KeyM before the broad interactive-target guard. Existing input-element exclusion remains intentional. |
| 4 — Room ambience lifecycle | `base.js` visibility synchronization sets `lastRoom = null` and sends `bridge.room(null)` before sleeping. The waking update can report its actual room again. |
| 5 — Unmute overrides rover pause | `audio.js` `setMuted()` changes settings and shared buses, then emits the settings event; it no longer changes engine/wind transport pause state. |

The original findings below are retained as the review history. Resolution verification was read-only; no new source edits, browser actions or scope expansion were performed. Runtime/listening evidence gaps listed at the end remain.

1. **P2 — Intro keyboard handler overrides focused buttons.** `src/landing.js:477–484` intercepts Enter/Space for every target during intro, calls `preventDefault()`, then advances. Tab to Back and press Enter: the next beat runs instead of Back. Tab to Skip and press Enter: the intro advances rather than skipping. Ignore keys originating on native controls (except explicit Escape), allowing normal button activation. The main handler already has a native-control guard, but landing registers its own independent handler.

2. **P2 — Controls disclosure is unreachable in the pause focus loop.** `src/ui.js:87` omits `summary` from its tabbable selector. Pause's Controls disclosure is after the last matched control (`src/main.js:415–417`), and the trap wraps from that last match to the first; keyboard users cannot reach/open the disclosure. Include `summary` and other actual focusable controls, excluding disabled elements consistently.

3. **P2 — Documented M shortcut is suppressed on virtually every pause control.** `src/main.js:506` returns for button/input/link targets before the M branch at line 507. `showMenu()` focuses Resume immediately. Therefore M while the pause menu first opens does nothing despite the mute button saying “(M)”. Process the mute shortcut before the broad target guard, but preserve text-entry exclusions. Sliders/check boxes should not suppress the advertised non-text shortcut.

4. **P2 — Room ambience does not transition reliably across hidden base scenes.** `src/base.js:186` sleeps the base loop on an overlay; `update()` returns for hidden base at line 327 before reporting the null room at lines 331–332. The bridge's overlay stop branch (`src/main.js:133`) consequently may never run. Opening a mini-game retains the room tone. If pause then calls `ambience.stop()` while the base is asleep, returning from that game into the same room may leave ambience silent because `lastRoom` still equals the current room. In `syncVisibility()`, explicitly send room null and reset `lastRoom` when hidden; a waking frame then re-establishes the actual room.

5. **P2 — Unmuting while paused can restart rover wind.** `src/audio.js:527` calls `wind.pause(false)` for every unmute. Rover pause handling silences wind only on the initial paused frame (`quiet` guard in `src/rover.js`). Mute and then unmute in a paused rover mission therefore re-enables wind until gameplay resumes or exits. The effects bus already handles global mute, so mute should not independently override the transport's pause envelope; remove the unconditional wind unpause or track both pause and mute states.

## Checks without findings

- Room ids align with `ROOMS`; engineering is translated to generator. Unknown hub/storage/corridor rooms fade to zero.
- Ambience uses one retained oscillator/filter/gain chain; room switches do not create extra voices. Volume/mute are inherited from the effects bus, visibility suspension from the shared AudioContext.
- Launch's phase guard prevents repeated immediate clicks from starting duplicate countdowns in the normal visible flow. Deferred countdown cancellation after external `hide()` is not implemented, but no current UI path was found that exposes that sequence.
- Crew/Rocky hit positions use the same camera/drawing coordinates, and minimum 44px target expansion preserves center. Menu controls are later in stacking order. Actual viewport overlap remains a live-layout check.
- Reduced-motion honors OS preference or root class. The app currently cannot override an OS reduce preference to enable menu motion; this is conservative and not a safety defect.
- No alien-cat or other external sound asset was used.

## Remaining evidence gaps

No live focus traversal, tiny-viewport interaction, real audio mix, hidden-tab media playback, or touch-device validation in this pass. These observations are source-confirmed control-flow findings, not claims of a full end-to-end acceptance pass.
