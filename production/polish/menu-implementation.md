# Menu and audio implementation

Implemented in `src/landing.js`, `src/landing.css`, and `src/audio.js`.

- Title appears immediately by default. Existing instructions remain available and Watch intro explicitly loads the video; no startup HEAD request or video preload. Video error/start/stall fallbacks remain.
- Continue mission appears when `hasSave()` returns true and `onContinue` is provided. It hides the landing screen before invoking the callback. New mission remains separate. Save loading, overwrite confirmation and session semantics belong to the main/state integration.
- Four crew members and Rocky have native labelled hit buttons aligned to their canvas drawings. Click/keyboard activation triggers a short reaction and an accessible greeting. Hit buttons sit below title/menu controls and are hidden outside title phase.
- Rocky gently follows the pointer within 24 horizontal / 18 vertical pixels of its home; touch does not track. OS reduced-motion disables following, background drift/zoom, crew hops and CSS motion, and skips launch motion. Character identity/greetings remain available.
- Added compact-height title layout and visible focus outlines for character controls.
- Startup volume values now reject malformed data and clamp finite numbers. Audio preference exports support Rocky babble and quiet alerts. Warning and near-station sound cooldowns reduce repeated triggering. Native synthesized effects retained.
- Global mute changes synchronize the intro video's mute state and the title's sound label.

Validation: `node --check src/landing.js`, `node --check src/audio.js`, and `npm run build` passed. Parent integration must verify visible control placement and Continue behavior against the live save implementation. Subjective audio listening and device testing remain unassessed.

The user withdrew the alien-cat sound reuse request. No external sound assets were copied or used.

## Room ambience follow-up

`ambience.setRoom(id)` and `ambience.stop()` are exported by `audio.js`. A single reusable triangle oscillator/filter/gain graph provides quiet room-specific tones with smooth frequency and gain transitions. It is created only after browser audio unlock and only when a room is requested. Repeated room changes reuse this graph. Unknown/null rooms and stop fade the voice to zero. Routing through the existing effects bus makes it obey effects volume and mute; shared audio-context suspension handles hidden tabs. Supported ids: generator, greenhouse, medbay, lab, air, command, kitchen, crew, airlock. Main/base integration must call setRoom as the occupied room changes and stop when leaving the base or pausing.

The landing reduced-motion check now observes both the OS preference and the root `reduce-motion` class. Small hit targets remain centered when expanded to the 44px minimum; menu controls remain above the character buttons. Syntax and production build passed after the ambience addition. This is source/build validation, not a listening test.
