# Public release — 15 November 2026

Play: https://junior-space-commander.sentientstudios.chatgpt.site/

Source download: https://junior-space-commander.sentientstudios.chatgpt.site/source.zip

License: https://junior-space-commander.sentientstudios.chatgpt.site/LICENSE.txt

## Publication provenance

- Sites project: appgprj_6af99adac2348191831cde8c2c9f5b5d
- Published version: 3
- Source commit: 74967c8618bb4975b844fbfe25a13e922af0ab9c
- Saved version: appgprj_6af99adac2348191831cde8c2c9f5b5d~appgver_255d1282b9fc8191b34638efcb84cb9f
- Production deployment: appgdep_6af99e0eed8481918c507476d06e3016
- Deployment result: succeeded; audience: public.
- Separate publishing checkout: /Users/wess/Documents/nasa/sites/junior-space-commander
- The original GitHub repository was not pushed or replaced.

## Automated release checks

- All 42 tests passed, including campaign checkpoint restoration, first-flight flow, resource guidance, NASA fallback, room states, clocks, quizzes and narration.
- The balance simulation completed all 96 decision paths in each of six scenarios (two difficulties and three play styles).
- Production build passed. The final rover-only CSS fix was rebuilt and packaged after the successful tests; it does not alter campaign logic.
- All 310 prepared voice clips were present and their hashes matched the voice manifest.

## Hosted checks

- First visit starts the intro; title and illustrated mode selection load.
- Five-step walkthrough points to resources, crew and objective, routes Max to Command and opens the terminal.
- Sol 1 decision changes resources and unlocks science. The full three-sample rock experiment completes and awards 10 points.
- Reload and Continue restore the decision, resources and 10 science points. Intro does not replay over a returning save.
- End-sol confirmation and summary lead to Sol 2. Its decision unlocks the rover mission.
- The production 3D rover loads; keyboard driving reduces distance to the first site. Prepared spoken instructions reach the speaking state.
- Rover clock overlap was repaired and verified in version 3: the clock is hidden during driving, the exit button is fully visible and usable, and returning to the base restores the clock. The panorama toggle also works on the hosted release.
- The final checked browser session reported no console errors. Evidence: hosted-base.jpg and hosted-rover.jpg.
- Anonymous browser-style GET requests succeed for the HTML, source ZIP, license, credits, video, voice manifest, optional ONNX model and WASM runtime. Large files were checked for access and content type; full optional model inference was not rerun on the hosted origin.
- Sites reports public access. No owner login is required for ordinary browser-style HTTP requests.

## Limits and handoff

Hosted smoke tests cover the first science mission and rover launch/driving, not a manual replay of all five sols or every minigame. Automated checks cover campaign progression. No second physical device was available for this release check; earlier phone-sized browser layout checks passed.

Saves stay in the browser/origin where played. Localhost progress is not automatically transferred. Prepared narration works independently of the optional personalized voice download. NASA live data has a labelled historical fallback.

Team/event details are intentionally deferred. The official NASA project form has not been submitted. Use SUBMISSION.md, THIRD-PARTY.md and DEMO-SCRIPT.md to finish that step through the registered team's Project tab.

## November 15 — responsive tasks and pause-menu update (version 5)

Published mobile next-task card and bottom sheet; desktop task card and side panel; crew portraits, priority ordering, blocked-task explanations, completed-task disclosure, and mission progress. Added Mars SVG/ICO favicon and mobile shortcut icons. Pause now separates Resume, Settings, and How to play, with restart/quit confirmations retained.

Source commit: `50ac5ace06de355151b7f17f3d26a2c79bfb242a` (Sites repository).
Validation: 42 automated checks passed; production build passed. Browser checks at 320px, 390px, and 1024px covered navigation, completed progress, disabled End sol explanations, Escape dismissal, Settings back navigation from a slider, and narrow-screen scrolling. No browser console errors observed.

## November 15 — station zoom (version 6)

Published station-only pinch/trackpad/wheel zoom, visible −/+ and percentage reset, and keyboard −/+ and 0 shortcuts. Camera level remains when switching astronauts and resizing; follow view is bounded by station artwork and a 125% maximum. Whole base remains the fitted panoramic view. Touch taps wait for release and multi-touch gestures never trigger walking or crew selection.

Sites source commit: `0a558f5d7d3b8cdce82f1dd2a8f129cd2c2dabdc`.
Validation: 68 automated checks passed, including 26 new camera/gesture checks; production build passed. Browser checked 320px and 390px phone views and 1024px desktop, minimum/maximum limits, keyboard reset, crew switching, overview compatibility, pause guards, and mobile control separation. Gesture sequences were tested automatically; physical-device pinch was not available in this session. No browser console errors observed.

## November 15 — clean mission journey and retained reports (version 7)

Published 90% default/reset framing, intro video on every homepage visit, single narration toggle beside dialogue navigation, removed quiz feature and repeated rover lessons, completed-save Play again behavior, and subtle CSS space atmosphere. Finished mission/site results return automatically with optional Keep reading. Science reports retain the explanation/source; daily reports retain tasks, science, resource changes and night operations. Daily celebrations advance automatically; opening the full report holds the journey. A larger finale leads automatically to the final report.

Sites source commit: `e04ea81638e9239c27abebee116d4902ddc3757e`.
Validation: 70 checks and production build passed. Browser verified one dialogue paragraph/one narration control, no quiz action, 90% framing, video replay on returning home, Sol 1–5 progression, cumulative science, full report hold/continue, science report Keep reading, automatic next-day handoff, finale, completed-home Play again and successful restart at Sol 1. Test task completion used the development fixture; campaign mechanics remain covered by the existing campaign tests. Hosted build and source download verified.

## November 15 — original Sol dashboard, rover-first campaign (version 8)

Restored the original Sol report dashboard with gauges, resources, night operations and crew jobs. It has no countdown; Start Sol 2 (or the next sol) is required before the short transition animation. Pending Sol 5 reports remain resumable; only a finished campaign offers Play again. Charles's new campaign science order is clear-weather rover sampling on Sol 1, indoor rock scanning on Sol 2. Compatible saved campaigns preserve earned science and completed mission identities.

Airlock approach widened/moved up and labelled AIRLOCK · ROVER EXIT; camera framing keeps the crew and station above fixed controls. Removed personalized voice Settings, generation and cloning workers/models; prepared MP3 narration remains. The deployment archive shrank from about96MB to32MB.

Sites source commit: `8cc587a56b1afafc93b7d86f0d2757184cbc9ce1`.
Validation: 81 checks passed and production build passed. Browser verified narration Settings has no cloning/download controls, Charles's Day 1 rover assignment and actual rover launch through the airlock, clear portrait airlock access, original report remaining open without auto-advance, and Start Sol 2 triggering the animation before the next day. Test task completion used the development fixture for the report flow. Hosted build and removed voice assets checked.

## November 15 — Beginner/Advanced chooser and Settings simplification (version 9)

Renamed displayed difficulty modes Beginner and Advanced, preserving stored difficulty IDs and gameplay balance. Added one/three difficulty stars, concise supply/scoring comparisons and illustrated compact mobile rows. Both options and Start fit at320×568 without scrolling; footer stays visible. Removed Comfort & Graphics controls and retired saved rendering overrides; reduced motion follows the device preference, and automatic renderer fallback remains.

Sites source commit: `89329c1d0efcb0057e658dd7fe053503c85bb1c9`.
Validation: 81 checks passed; production build passed. Browser verified no chooser body overflow at320×568, accessible star labels/selected state, desktop cards, Advanced launch supplies60/60/55/75, and Settings with only sound/narration controls. Public release verified.
