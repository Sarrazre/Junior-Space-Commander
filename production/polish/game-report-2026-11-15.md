# Game lifecycle and performance assessment — 15 November 2026

Verdict: **NEEDS MORE WORK**. Source inspection reveals lifecycle defects; a production build succeeds. This is an assessment of the baseline at commit `460cc85`, not a claim that every defect below remains after the parent agent's fixes.

## Evidence and limitations

- Inspected main orchestration, state, base rendering, rover lifecycle, shared animation/UI helpers, mini-game timers, audio lifecycle, NASA data fetching, build configuration and shipped asset sizes.
- Ran `npm run build`: succeeded, 35 modules, 1,994.95 kB JavaScript (547.78 kB gzip), 35.36 kB CSS (9.03 kB gzip), 4.08 kB HTML (1.48 kB gzip). Build wall time reported 1.39 s on this machine; this is not a browser load benchmark.
- `du` reports approximately 9 MB for `public/assets/intro.mp4`, 356 KB base artwork, 268 KB landing artwork, 9.8 MB public assets overall. Disk figures are approximate, not measured transferred bytes.
- No target-device frame budget, memory ceiling or performance capture was supplied. FPS, percentile frame time, GPU memory, mobile thermals, long-session stability, and minimum-device compatibility: **NOT ASSESSED — NO DATA**. No fabricated headroom or release-readiness pass.
- Reproduction instructions below derive from code paths. They are not claims of completed interactive reproduction.

## Prioritized defects and optimization list

| Priority | Finding and evidence | Player impact and reproduction | Bounded remedy / owner |
|---|---|---|---|
| P1 | Mini-game clock ignores pause. `src/art.js:18–31` always advances canvas simulation. `src/minigames/repairs.js:88–115` schedules sequence playback with ordinary timers. `src/minigames/engineering.js` advances report progress with an interval. | Pause while watching the shield sequence; wait through its playback; resume and it is already the player's turn. The pause screen hides information while game timers continue. Rover-site drilling animation also continues because its loop uses the shared helper. | Introduce a pause-aware active-time scheduler shared by mini-games and canvas simulations; migrate gameplay timers and input guards. Gameplay programmer. |
| P1 | Async mission work lacks session identity. `src/main.js:224–240` awaits NASA data before opening a fact card, but restart/quit does not invalidate that continuation. | Complete Sol 4 science with slow network, immediately pause and quit/restart during the fetch. When the fetch resolves, the old mission can open a fact modal over the title/new mission. Old cleanup can also reset shared busy state after a new interaction starts. | Increment a mission generation on stop/start; capture and check it after awaits, before global UI changes, and in finally blocks. Optionally cancel mission-owned requests. Gameplay programmer. |
| P1 | WebGL initialization has no recovery path. `src/rover.js:385–388` exposes the rover overlay before constructing the renderer; exit controls and abort handler are installed much later. | On a device/browser where WebGL initialization throws, a visible blank rover overlay can remain and the science task cannot complete. | Guard initialization, restore DOM/music on failure, present actionable retry/back controls and a supported fallback for a required mission. Engine programmer. |
| P2 | Completed sites detach resources before teardown. `src/rover.js:450` removes crystal, beam and label; `:633` disposes only objects still in the scene. | Complete sites and leave the rover repeatedly. Removed beam/label materials/textures and geometry are excluded from explicit GPU disposal. Actual memory growth needs measurement. | Keep completed objects in the scene with `visible=false`, or track owned resources in a disposal registry and dispose once at teardown. Engine programmer. |
| P2 | Leaving tasks does not cancel all delayed work. `runGame` teardown runs registered cleanups, but several direct `setTimeout` calls in engineering/repairs/botany/medical are unregistered; `api.finish` has no closed guard. | Complete a puzzle, leave before its delayed success callback; the detached game can still play its victory cue and allocate a result canvas. | Per-task abort token plus closed/idempotent guards, shared cancellable scheduler, register all delays. Gameplay programmer. |
| P2 | No mission persistence. `src/state.js` is memory-only; `main.js` resets on initial load; only audio preferences use localStorage. | Refresh/close loses progress across a five-sol session, including solved puzzles. | Versioned checkpoint at atomic task/crisis/sol boundaries, restore data by task ID (not serialized functions), validated import, Continue/New Mission UI, clear policy for in-progress puzzles. Gameplay programmer. |
| P2 | Base continues drawing under title/rover/modals. `src/base.js:301–360` only guards movement; ambient particle emission and update continue. | Hidden base animation competes with the Three.js rover and landing scene for CPU work. Actual cost is unknown. | Separate simulation pause from render visibility; suspend hidden base scene and resume with correct clock/input state. Profile before/after. Engine programmer. |
| P2 | All engines ship in one initial JavaScript bundle. `src/minigames/index.js` statically imports rover, which statically imports Three.js; Phaser is also initial. Build confirms a ~2 MB minified JS file. | Higher cold-start parse/download work on classroom tablets and slower networks. | Dynamically import rover on demand or prefetch after first interaction; show load/retry state; measure cold and repeat loads. Engine programmer. |

## Implicit state machines worth making explicit

Mission flow currently lives across `started`, `busy`, `G.paused`, several hidden DOM containers and unresolved promises. Model `title → briefing → base → activity → result → base → sol-summary → next-sol/finale`, with pause orthogonal to active gameplay and cancellation invalidating the entire session. Every transition needs one owner and one atomic commit point for rewards.

Rover already names `intro`, `drive`, `task`, `dock`; retain this useful design, but add `loading`, `error`, `ended`, explicit ownership of resource cleanup and cancellation checks after both astronaut walks and site activities. Early leave/restart should never resume a stale activity or change music in a later mission.

Task lifecycle should be `ready → active → succeeded/cancelled`, with `complete` idempotent and reward application exactly once. Timer cleanup belongs to the task lifecycle, not to each puzzle author remembering individual browser APIs.

## Verification plan

1. Pause at the first/middle/last flash of the sequence; wait; resume. Remaining sequence order and timing must be preserved. Repeat in drill and report activities.
2. Delay Sol 4 NASA response, quit and restart before it arrives. No prior mission modal, music, rewards, or busy flag may affect the new mission.
3. Leave each mini-game during delayed success; verify no delayed sound/UI/reward and no growing timer count across repeated attempts.
4. Force WebGL creation failure; verify understandable fallback and a route back to base. Required science must have a workable supported path.
5. Complete and exit 10 rover missions; record renderer resource counts and heap trend after teardown. Avoid equating browser retained memory with a leak without attribution.
6. Save at task, crisis and sol boundaries; reload; verify resources, random sickness, conditional tasks, task completion and scoring. Corrupt/old checkpoints must recover safely.
7. Measure cold-start loading, 60-second base/rover frame distributions, and memory on a named minimum tablet and desktop before setting release budgets. Compare dynamic import and hidden-base suspension against that baseline.

## Existing strengths

Rover caps pixel ratio at 2, uses instanced tire tracks, reuses several math objects per frame, cancels its animation frame, removes keyboard listeners and explicitly disposes most renderer resources. Canvas illustrations self-stop when detached. Several interval-based puzzles register cleanup. NASA data has a timeout and an honest saved-data fallback. These are useful foundations to standardize rather than replace wholesale.

## Handoff

Programming items above are handed to the parent implementation pass; this specialist changed no game source. A production build alone does not verify gameplay, accessibility, sound mix, or release readiness. This dated report is a human review record under `production/polish/`; no existing automated gate consumes it.
