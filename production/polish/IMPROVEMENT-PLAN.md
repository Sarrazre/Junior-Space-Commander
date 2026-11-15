# Junior Space Commander — review and improvement plan

Baseline review, 15 November 2026. This document records the game **before the subsequent implementation pass**. Current features, resolved findings and verification are recorded in [IMPLEMENTED.md](IMPLEMENTED.md). The historical findings and recommendations below are retained for comparison; they are not a current bug list.

## Recommendation

Build the fantasy of **a crew whose work visibly transforms a living Mars base**. Keep Rocky, the four specialists, the five-sol campaign, the illustrated base and the rover. The biggest gain comes from connecting their actions and making decisions matter. More assets alone will not create that connection.

Recommended first milestone: one outstanding greenhouse rescue mission that demonstrates navigation, meaningful choices, tactile interactions, visible recovery, audio feedback and reliable saving. Use it as the quality reference for the rest of the campaign.

Working audience assumption: children roughly 8–12 with optional adult help; confirm through playtesting. This is a proposed direction, not an approved age specification or scope estimate.

## What was actually reviewed

- Browser: intro/title, briefing, crew switching, movement to stations, engineering wire puzzle, science scanner clue collection and answer cards, leaving a task, pause/resume and task completion.
- Source: five-sol campaign and resource rules, mission progression, modal/mini-game ownership, base navigation, rover lifecycle, asset approach and audio architecture.
- Diagnostics: production build, four automated regression tests, and a repeatable simulation of all 96 crisis-choice combinations.
- Studio tools used: local game-designer guidance, balance-check, and team-polish assessment with technical-art and performance reviewers. Their full records are in this folder. These records are for humans; no automated release gate consumes them.
- Not assessed: a complete manual five-sol playthrough, all puzzle variants, actual sound mix/listening, mobile hardware, GPU memory measurements, frame-rate profiling, long-session stability or child playtesting. Source evidence is identified separately from observed behavior.

## Current mechanics

The player chooses Max (engineering), Elsa (medicine), Charles (science) or Lea (botany), walks to a matching station, and solves its puzzle. Each sol has a command-center crisis, one scored science task and supporting crew tasks. A crisis decision plus the science task unlock ending the sol; other unfinished tasks can be skipped after a warning. End-of-sol solar production, consumption, food growth and low-resource penalties update the base. After five sols, the score weights science 50%, task completion 30% and average remaining resources 20%.

The activities already have useful variety: matching wires, rotating pipes, memory sequences, exact-sum charging, scanning rocks, greenhouse controls, medical interpretation, radiation/DNA puzzles, driving and expedition site activities. The strongest science structure is observe → collect evidence → infer → receive an explanation. Preserve that structure rather than adding disconnected quizzes.

## Highest-impact findings

| Priority | Evidence | Player impact | Next action |
|---|---|---|---|
| P0 | Source: progress lives only in `S`; only audio settings persist | Refresh/closing loses a campaign | Versioned checkpoints and Continue mission |
| P0 | Source and live pause check: mini-game timers formerly advanced while paused | Missed cues and unexpected completion | First fix implemented; expand lifecycle coverage to rover site tasks |
| P0 | Source: late NASA response could reopen an old fact screen after restart | Old mission UI over new game | Mission epoch guard implemented; add delayed-network regression |
| P1 | Simulation: all 96 paths score 93–98 with perfect puzzles/all tasks/no sickness | Strategic choices have little score separation | Design explicit balance targets, then tune via scenario tests |
| P1 | Full starting resources cap many rewards; shield falls from 100 to 60, while damage starts below 40 | Promised benefits vanish; radiation warning has weak stakes | Preview actual effects and model multi-sol consequences |
| P1 | Source: science can precede Sol 1's decision | Completing science before dimming the lab bypasses its cap | Establish decision-before-science or an explicit retroactive policy |
| P1 | Browser: tasks are text, destinations require interpreting a large scrolling base | Navigation competes with learning | Actionable task rows, destination marker and route hint |
| P1 | Source: no single explicit mission phase; several booleans and unresolved aborted promises | Pause/restart/quit combinations become fragile | Introduce explicit lifecycle and cancellation ownership |
| P1 | Source: WebGL initialization has no recovery; removed rover markers escape final scene traversal | Potential blocked screen or retained GPU resources | Recoverable rover launch failure and complete resource disposal |
| P2 | Art: base labels/furniture baked into one background | Hard to localize or show repaired state | Separate labels and stateful foreground props |
| P2 | Build: about 1.996 MB JavaScript, 548 KB gzip; intro about 9 MB | Cold-start risk on slow devices | Defer rover code and optional intro; measure on target devices |

Balance qualification: `tests/balance-simulation.js` is a simplified economic model, not a player study. No numeric target ranges or target success distribution were found for this game's intended audience, so outlier compliance is NOT ASSESSED — NO DATA. The 93–98 range demonstrates compressed outcomes under the stated assumptions, not that every child will find the game easy. Task order and random sickness need additional scenarios. Do not indiscriminately lower starting resources until fair recovery paths exist.

## Design pillars and scope choices

1. **I know how to help.** One clear next action, visible feedback, safe retry.
2. **My crew works together.** One specialist's result becomes another's useful input.
3. **Mars remembers my choices.** The base and later missions show consequences.
4. **I discover through evidence.** Experiments reveal a rule; facts explain what happened.

Recommended scope is a polished five-sol campaign. A larger sandbox could add replayability but requires a much bigger economy/content effort. A short classroom activity mode is a good later addition; it should reuse campaign missions rather than split the project now. Retain the current browser technology during this pass.

## Build order and acceptance criteria

### 1. Reliability and orientation

Add explicit phases: title → briefing → base → task → result → base; base → sol summary → next briefing/final report. Pause is a suspended state carrying the previous phase. Restart invalidates the entire mission generation. A task owns its timers, listeners, audio and GPU resources and disposes them on every exit. Commit rewards exactly once after completion.

Save a versioned snapshot after crisis decisions, accepted task results and sol transitions. Store task IDs/completion, resource values, science, long-lived/sol flags, sickness, log, current crew and phase. Reconstruct definitions/functions from static data; never serialize DOM, timers, callbacks or Three objects. An interrupted puzzle resumes at its entrance with previously committed rewards preserved. Persist an end-of-sol marker to prevent double daily consumption. Handle malformed/old saves, storage failures and two open tabs. Offer Continue/New mission, with explicit replacement confirmation.

Make the task list actionable: select its astronaut, highlight its station and offer navigation. Show a persistent current objective and explain why End sol is disabled. Introduce movement, interaction and crew switching through short playable steps instead of front-loading instructions.

Acceptance: refresh at every checkpoint preserves committed progress; restart during every overlay cannot restore stale content; pause hides no progressing challenge; a new player reaches the first task without adult navigation help.

### 2. One polished greenhouse rescue

Connect existing roles: Max repairs frozen pipes → Lea inspects roots/light/temperature → Elsa checks food suitability → Charles records the experiment. Keep the supporting steps short and allow the player to inspect why a dependency exists. Do not turn every task into a mandatory four-character relay.

Use observe → hypothesize → intervene → verify. Let players inspect a stressed specimen, choose an intervention and see its measured response. Include one guided safe experiment, then a variant that requires applying the rule. Incorrect actions explain the mismatch and allow correction. Separate learning progress from mastery medals so experimentation does not permanently ruin the mission score.

Make the result physical: leaves recover, circulation starts, greenhouse lighting changes and tomorrow's harvest forecast updates. Store the discovery in a field journal. End with a brief crew reaction and a concise scientific explanation.

Acceptance: the task works by drag, click-to-place and keyboard; invalid drops return the object; success visibly changes the base; the player can explain why the solution worked.

### 3. Balance and campaign arc

Show before/after resources and tomorrow's forecast beside each decision, including when a resource is already full. Make at least two options sensible in different starting states. Prototype a forgiving Explorer mode and an optional Commander challenge using shared missions. Treat suggested difficulty changes as hypotheses to test.

| Sol | Recommended emotional beat | Mechanical improvement |
|---|---|---|
| 1 | Confidence and belonging | Short tutorial repair; controlled first trade-off; useful reward headroom |
| 2 | Surprise and exploration | Dust visibly reduces production; cleaning affects later sols; samples return to lab |
| 3 | Care and recovery | Connected greenhouse rescue; choices reference earlier power/food decisions |
| 4 | Preparedness under pressure | Clear exposure forecast; player actions meaningfully change danger; safe reading time |
| 5 | Mastery and payoff | Route planning uses prior discoveries; final report reflects actual collected evidence |

Give the crew small personal goals and context-sensitive reactions. Replace generic end-day praise with specific causal feedback. Add optional discovery objectives and a persistent specimen cabinet before adding more days or collectible currencies. The report-to-Earth task should draw from completed discoveries rather than presenting a static list of findings.

Acceptance: compare all choices under healthy and stressed resource states; test skipped tasks, low power, sickness, retries and short expedition; no unavoidable soft-lock; explain the consequence of each choice in one sentence.

### 4. Art, interactions and sound

Preserve the articulated astronauts and base identity. Standardize controls, icon silhouettes and text hierarchy across painted rooms, pixel terminals and the low-poly rover. Use readable body type and reserve pixel text for short instrument labels. Create foreground object layers before replacing the whole background.

First asset family: healthy/stressed/recovering greenhouse specimens. Then repair parts, rock samples, clean/dusty panels and Rocky expressions. Use one object per transparent PNG/WebP with consistent scale, pivot, lighting and outline. Keep text and shadows separate. Validate alpha edges and readability at the actual small display size. The generated lettuce pod shown in chat is a concept preview only; it is not integrated or a tested draggable asset. It needs matching states and scale tests before production use.

Define interactions alongside art: focus/hover cue, lifted drag preview, valid target outline, snap, invalid-drop return, click-to-place and keyboard equivalents. Reward cues should be brief and informative, not repeated full-screen interruptions.

Keep the existing synthesized audio foundation: it already has themes, ducking, volumes, engine and wind. Add quiet room ambience, consistent tool/placement sounds and a small musical tension layer tied to the actual crisis. Rate-limit alarms, separate Rocky chatter volume and pair every important sound with a visible cue. Listen on headphones and small speakers before claiming mix quality.

Acceptance: asset states differ by shape as well as color; mute covers video and game; no audio accumulates after repeated exits; reduced-motion mode preserves information; modal focus, 200% zoom and touch scrolling work.

### 5. Performance and playtest gate

Defer the rover module until needed, make the intro optional, suspend hidden rendering, and add quality levels for shadows/particles only after profiling. Establish target devices and budgets before declaring success. Exercise WebGL failure, context loss, unavailable NASA data, slow fonts, background tabs and repeated mission enter/exit.

Run small observed playtests with the intended age group. Record time to first meaningful action, navigation requests, misunderstanding of resource choices, puzzle abandonment and what players can explain afterward. Proposed first-sol length is 5–8 minutes; validate it rather than forcing every player to match it. Keep initial measurement local/manual; do not add child analytics accounts as part of this polish pass.

## Implemented in this review

- Added an owned, pause-aware clock for the six ordinary terminal mini-game modules. Delays/repeating jobs stop on task exit; pause/hidden tabs do not consume their clock time.
- Shared canvas animation time now freezes while paused/hidden.
- Guarded task reward application and late NASA fact screens against an invalidated mission; old interaction cleanup cannot clear a new mission's busy flag.
- Prevented duplicate/late terminal completion screens.
- Added keyboard activation and button semantics to shared clickable div cards/choices; restored browser zoom permission. Full accessibility is still outstanding.
- Resource events now report the actual clamped delta, avoiding false gain flashes at full capacity.

Validation: four Node regression tests pass; production build succeeds; diff whitespace check passes. Browser confirmed scanner-card Enter activation, leaving the scanner, wire task completion held during pause, resumed completion and correct task checkmark. No browser errors were returned in that check. The NASA restart guard is source-reviewed, not network-delay browser-tested. Rover site timers, full focus containment, save/resume, reduced-motion support and the larger design plan are not implemented yet.

No commits or pushes were made. Remaining release risks are explicit above; this review does not claim that every game defect has been found or fixed.

## Reproduce the checks

From the game folder: `node --test tests/*.test.js`, `node tests/balance-simulation.js`, `npm run build`.

Companion assessments: `game-report-2026-11-15.md` (performance/lifecycle baseline) and `game-render-notes-2026-11-15.md` (art, interaction and audio). Baseline findings predate this review's fixes; the implemented list above records the current status.
