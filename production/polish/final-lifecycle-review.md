# Final lifecycle regression review

Read-only review of the implementation on 15 November 2026. No browser interaction and no source edits in this pass. Locations below refer to the reviewed version; the parent may fix them during integration.

## Follow-up verdict: all three findings resolved

Verified the parent's final changes by reading the affected code and running `node --test tests/*.test.js`: **22/22 tests pass**, including six campaign tests covering 96 paths each (**576 campaign scenarios**, with checkpoint restoration), the new stale-read regression, and invalid journal-medal/sol regressions. No new concrete issue was identified within this bounded follow-up. Browser behavior remains the parent's integration scope.

- `src/save.js:14` now claims an explicitly supplied revision; `continueMission` supplies `saved.revision`. The stale snapshot cannot claim the intervening writer's revision.
- `src/state.js:144` validates journal mastery as integer 1–3, science as boolean, and sol within the saved campaign. The demonstrated crash input is rejected.
- `src/rover.js:517–524` now handles keys only in drive mode and skips interactive targets. Site-task buttons retain their native Space behavior.

The separate localStorage read/write atomicity limitation noted below remains a design limit, not a claim that the fixed stale-claim regression is unresolved.

## Findings

### Resolved P1 — Continue could claim an unseen checkpoint and overwrite newer progress

Locations: `src/main.js:477–482`, `src/save.js:14–20`.

Continue reads checkpoint A, restores its state, calls `claim()` which independently rereads storage, then writes the restored state immediately. If another tab writes B between the first read and `claim`, the second tab adopts B's revision while holding A's data. Its subsequent stale write passes the revision check and replaces B. The storage-event pause happens asynchronously and cannot reliably prevent this ordering.

Confirmed using two save stores sharing an in-memory storage adapter: A writes `{step:1}`; B reads it; A writes `{step:2}`; B calls claim and writes its saved read. Actual result: `{ok:true}`, persisted data `{step:1}`. This is an intentional interleaving reproduction, not a timing-dependent browser claim.

Fix: claim the exact revision from the snapshot being restored (`claim(saved.revision)`) instead of rereading storage. A changed current revision then produces conflict. For strict simultaneous cross-tab writes, serialization such as a Web Lock or a transactional store is still needed; separate localStorage get/set operations are not an atomic compare-and-swap.

### Resolved P2 — Accepted corrupt journal mastery could crash the discovery cabinet

Locations: `src/state.js:136`, `src/main.js:492`.

Restore validates a journal entry's title, sol and text but not its mastery. A saved entry with `mastery:-1` is accepted. Rendering the journal calls `'★'.repeat(j.mastery || 1)` and throws `RangeError: Invalid count value: -1`. Confirmed in Node using a fresh valid snapshot with only that journal entry changed. Very large positive values can also create excessive strings.

Fix: validate optional mastery as an integer from 1 to 3, keep any deliberate legacy missing-value default, and bound journal sols to the current campaign. Rendering can also clamp defensively. Add corruption regression coverage for this field.

### Resolved P2 — Rover driving handler suppressed Space on focused mini-game controls

Location: `src/rover.js:517`.

The global rover key handler prevents the default action of Space regardless of rover mode or focused target. While a rover-site task is open, native buttons such as DRILL, TAKE PHOTO and BACK TO THE ROVER consequently cannot use their normal Space activation. The handler's call to `act()` returns because mode is `task`, but the default was already cancelled. Enter may work, so this is a broken documented keyboard interaction rather than a complete progression lock. Source-derived finding; not browser-reproduced in this pass.

Fix: process driving keys only in `drive` mode and ignore interactive targets, preserving native form/button keyboard behavior. Check focused site controls and the global pause button as part of the parent's browser pass.

## Checks passed

- Existing save and clock tests: 11/11 passing.
- Production build: succeeds, 41 modules; initial JS 1,413.26 kB (400.60 kB gzip), deferred rover 613.62 kB (159.10 kB gzip).
- `git diff --check`: passes.
- Reviewed normal summary resume and idempotent end-of-sol processing, conditional late-panel reconstruction, sickness restoration without replayed penalties, mission-epoch cancellation guards, rover lazy-load cancellation, WebGL retry/back/instrument fallback, scoped site-clock teardown, and pause/hidden-time behavior. No additional definite regression identified in those normal paths.

## Limits

Browser gameplay, forced WebGL failure, GPU context-loss behavior, actual GPU/heap resource counts, minimum hardware performance and long-session soak testing are outside this pass. Unexpected exceptions after WebGL construction remain a resilience area to test: cleanup is principally registered after scene construction. Passing build/unit checks does not demonstrate those exceptional paths are covered.
