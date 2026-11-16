# Mission polish — implementation and verification

Subsequent visual sprint: see [VISUAL-SPRINT.md](VISUAL-SPRINT.md) for the new room artwork, generated plant states, anchored greetings and menu treatment. Details below record the earlier reliability/gameplay pass.

15 November 2026. Local branch: `codex/mission-polish`. No commit, push or deployment performed. These reports are human-readable records; no automated release gate consumes this folder.

## Delivered

| Area | Current behavior |
|---|---|
| Interactive title | Each astronaut reacts to click/keyboard activation and gives a personal greeting. Rocky follows the pointer within bounded space and reacts on click. Intro/video is optional and loaded on demand. Continue appears when a checkpoint exists. |
| Campaign continuity | Versioned local checkpoints after accepted tasks, decisions and sol transitions. Definitions are reconstructed from static data. Restoring does not replay sickness/storm costs. Summary processing is idempotent. Corrupt saves, unavailable storage and stale-tab revisions are handled. |
| Navigation | Clickable crew tasks, an explicit Next objective, automatic route following, a visible route and an explanation of what unlocks End sol. Compact screens collapse the task list after navigation. |
| Mission connections | Science requires the daily decision. Sol 3 links Max's water-supply repair to Lea's greenhouse rescue. Sol 5's report requires the expedition and uses the crew's recorded science discoveries. |
| Greenhouse rescue | Generated transparent plant asset; drag, click-to-place and keyboard input; inspect three clues, revise a hypothesis, repair the tray connection, watch a simulated recovery, compare a reference plant and record the finding. Revision during investigation is penalty-free. |
| Living base and journal | Persistent labels show dusty solar panels, restored water, recovered greenhouse and shield safety. Every completed activity adds a journal entry with mastery stars. |
| Decisions and balance | Immediate resource previews show actual clamped changes and an approximate evening forecast. Explorer protects science learning from retry penalties; Commander retains mastery scoring and starts with tighter supplies. Final tips reflect the selected mode. Daily reports show actual changes at resource limits. |
| Sound | Single reusable room-ambience voice, quieter/rate-limited alerts, Rocky voice toggle, consistent mute handling and reduced crisis tension after a decision. Existing synthesized sound palette retained. No alien-cat effects added. |
| Pause and cleanup | Ordinary mini-games and rover site tasks own pause-aware timers. Exit cancels scheduled work. Mission epochs prevent stale task rewards, dashboards and late NASA responses from resurfacing after restart. Rover controls clear on blur/visibility loss. |
| Performance and recovery | Rover code loads on demand; hidden base rendering sleeps. GPU resources are deduplicated on disposal. Graphics failure offers retry/back/instrument mode. Instrument mode can also be selected without a graphics failure. Gentle graphics reduces rover rendering cost. |
| Access and readability | Native keyboard activation for choice cards, top-layer focus containment including disclosures, visible focus, readable terminal body copy, zoom permission and touch scrolling. Reduced motion covers menu/base reactions, decorative illustrations, confetti and rover motion effects. Meteorite scanning supports arrow keys/Enter; rock layers have native buttons. |
| Science accuracy | Corrected hematite's misleading strong-magnetism clue. NASA responses validate shape/date/class and fall back after a timeout; removed the previously embedded personal API key. Sources remain visible, and invented experiments/readings are labelled as teaching models. |

This is a bounded implementation of the five-sol campaign improvements, not a claim that every possible enhancement or asset family has been produced. The painted base remains; foreground state labels and the new greenhouse specimen supply immediate visible feedback. The specimen's stressed/recovering states use explicit labels and CSS shape/color changes rather than additional generated illustrations.

## Verification completed

- `npm test`: **22 tests pass**. Six of them run all 96 crisis-choice paths across Explorer/Commander and three task/retry/sickness scenarios: **576 full economic/lifecycle simulations**. They restore and compare every checkpoint and ensure daily costs cannot be applied twice. This is not a substitute for playing every puzzle.
- Save regressions cover start penalties, completed conditional panel tasks, corrupt envelopes/arrays/medals, phase consistency, unavailable storage, stale tabs and the read/claim race found in final review.
- NASA tests cover live response selection, invalid/empty data and five-second timeout fallback. The late-response mission-epoch guard was source-reviewed; restart during an actual delayed network response was not browser-tested.
- `npm run build`: succeeds. Initial JavaScript **401.07 kB gzip**, compared with approximately **548 kB** at baseline (about **27% less initial JavaScript**). The rover is a separate **159.54 kB gzip** chunk. This is a transfer-size comparison, not an FPS measurement. The transparent greenhouse PNG is about 1.2 MB and requested when its mission renders.
- `git diff --check`: passes.
- Browser: menu character/Rocky greetings, optional intro and keyboard Skip, new-mode selection, saved task/resources after refresh/Continue, discovery cabinet, pause settings, M shortcut from a focused button, keyboard access to the Controls disclosure, task navigation, ordinary terminal leave/completion, full greenhouse rescue through its completion result (including plant placement, wrong-hypothesis guidance and connector drag), 3D rover rendering/driving/exit, complete three-stop instrument expedition, held weather-station completion during pause and successful resume, keyboard weather-station/photo/layer inputs, keyboard meteorite scan and cancelled search.
- Compact title/base layout observed at 487 CSS px wide; temporary viewport override reset. This is not a physical phone test.
- No browser console errors were returned by the completed interaction-check log inspection. Source reviewers rechecked and closed all eight findings in `final-lifecycle-review.md` and `final-menu-review.md` after fixes.

## Balance diagnostics

The candidate economy creates room for earned rewards and a larger distinction between campaign choices. These ranges do not establish age-appropriate difficulty:

| Simulated behavior | Explorer success | Commander success |
|---|---:|---:|
| All tasks, perfect puzzles, no sickness | 89–96 | 83–94 |
| Essential tasks only, two mistakes per science game, Lea sick on Sol 3 | 61–68 | 48–52 |
| All tasks, four mistakes per science game, Charles sick/treated on Sol 3 | 87–94 | 59–63 |

Full assumptions and best/worst choices are in `balance-results.json`. No numeric player-success targets have been approved; tuning remains a playtest candidate.

## Release validation still needed

Status: **NOT ASSESSED for public release**. No known open finding from the final source reviews remains, but the following evidence cannot be replaced by source inspection:

- A complete manual five-sol campaign and every puzzle variant/order.
- Observed playtests with the intended age group, including first-task time and comprehension of choices/science.
- Listening on headphones/small speakers, physical touch-device testing, 200% zoom and a full screen-reader review.
- Actual WebGL initialization/context-loss fault injection, GPU memory/FPS profiling, minimum-device budgets and a long-session soak.
- Simultaneous cross-tab writes beyond the tested stale-revision interleaving; localStorage checks provide best-effort conflict detection, not a transactional cloud save.

No analytics, accounts, external publishing, or extra game-world expansion was added.

## Science references checked during this pass

- [NASA CCMC: May 2024 storm record](https://ccmc.gsfc.nasa.gov/storms/may2024/) — historical flare example and active region.
- [NASA: Martian blueberries](https://science.nasa.gov/resource/martian-blueberries-2/) — hematite concretions and evidence of an ancient watery environment.
- [University of Minnesota: Hematite](https://commonminerals.esci.umn.edu/minerals-g-m/hematite) — hand-magnet behavior and distinction from magnetite.

Artwork provenance: `public/assets/greenhouse/README.md`. Specialist implementation records in this folder predate final integration; this document records the integrated verification.
