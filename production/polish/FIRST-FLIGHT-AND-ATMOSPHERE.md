# First flight and Mars atmosphere — 15 November 2026

This pass responds to the pasted-on greenhouse artwork, missing first-run intro, unexplained difficulty choices, unanchored guidance, task priorities, and the request for day/night and educational Mars time.

## Delivered

- Restored the original illustrated greenhouse. Removed the dark replacement bed, separate realistic pots, duplicate glass ribs and oversized plant sprites. Healthy crops use the original background; the damaged state uses a matching edit of the same dome. Crop recovery fades back to the healthy illustration.
- Added aligned night artwork with dark outdoor terrain and warm, readable interiors. Damaged crops have their own matching night variant. Night crop layers are composited before lighting fades, avoiding rectangular seams and ghost leaves during transitions.
- Automatically plays the intro on the first visit without a checkpoint. Muted autoplay has a sound opt-in. Slow connections, unavailable video and loading timeouts fall back to the illustrated intro. Skipping/completing remembers the visit; returning missions still have Continue.
- Illustrated Explorer and Commander cards explain starting supplies and scoring. Selection is separate from launch; returning checkpoints are replaced only when launching. Both modes retain the same missions and available help.
- Five-step guided walkthrough highlights the actual resource meter, crew buttons, objective and Interact control. A connecting arrow points to each target. It sends Max on the real route, waits for his arrival and opens the real Command terminal. Supports skip, pause/resume, keyboard focus, reduced motion and replay from Pause. Five recorded Rocky lines accompany the tour.
- A shared recommendation drives the objective and task list: decision first, urgent repair when resources are low, science prerequisites, science, then remaining crew work. Text badges distinguish DO FIRST, URGENT, SCIENCE MISSION and NEXT UP. A short two-cycle emphasis runs only when the recommendation changes; no perpetual blinking or moving text.
- Earth local time and a clearly labelled Mars teaching clock appear together. The Mars clock is initially synchronized with the local reading and then advances at the slower Mars solar-day rate. Its epoch persists across reloads. It is not a real landing-site time zone.
- Interactive clock comparison demonstrates 0–48 Earth hours. After 24 hours: Earth 00:00, Mars 23:21. After 48: Earth 00:00, Mars 22:42. Day/night can follow the teaching clock or be selected manually. It never changes mission resources, deadlines or sol progression.
- Outdoor wind/dust streaks stay outside rooms. Sol 2 has stronger dust motion. Reduced motion removes the streaks; pause freezes them. Ordinary rain is deliberately excluded from present-day Mars. Weather follows the story, not live telemetry.

## Science and limits

Solar-day comparison: 86,400 Earth seconds versus 88,775 Mars-sol seconds, rounded to the nearest second. The lighting cycle is illustrative, without a landing-site latitude or seasonal model. A solar storm is radiation, distinct from a dust storm.

- [NASA/JPL InSight day length](https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance/)
- [NASA Mars facts: water, thin atmosphere and dust storms](https://science.nasa.gov/mars/facts/)

## Asset provenance

Generated with the built-in image generation tool, using `public/assets/base.webp` as the edit target. The original asset is unchanged. JPEG conversion/resizing is mechanical packaging. Runtime crops limit damaged-state changes to the greenhouse.

| Asset | Prompt brief |
| --- | --- |
| `public/assets/visual/base-wilted.jpg` | Preserve full framing, geometry, text, dome, glass and surrounding rooms; change only greenhouse plants to drooping yellow-olive leaves and dull shrivelled tomatoes, rooted in the original shared soil bed. Match bold cartoon linework; no pots, panels or backgrounds. |
| `public/assets/visual/base-night.jpg` | Preserve all object positions and architecture; change only lighting to cool indigo/plum outdoor terrain, warm ceiling lights, cyan consoles and illuminated greenhouse. No added sky, moon, stars on the ground or rain. |
| `public/assets/visual/base-night-wilted.jpg` | Use the night image as target and daytime wilted image as plant reference; change only greenhouse plants, keeping warm grow lighting and the rest of the night scene unchanged. |

Original generated PNG identifiers: `exec-77a31023-c984-48a2-b714-2a868c14a67f`, `exec-c60c3c52-98e3-40f7-be7f-a9548e0972ad`, `exec-86d5d3b9-c6c3-4963-9c6a-e77c0496e546`, under the current Codex session’s generated-images directory.

Mission-card illustrations reuse the game’s existing canvas astronaut and rover drawing functions. No extra image download is required for those cards.

## Validation

- Automated suite: 40 passing checks, including first-run preferences, task-priority transitions, low-resource recommendations, clock arithmetic and persistence. Existing campaign, save and voice tests remain passing.
- Production build and whitespace checks pass.
- Browser: fresh autoplay confirmed with video playing muted and a sound opt-in; returning visit skips intro; Commander launch uses 60/60/55/75 supplies; complete five-step walkthrough reaches Command; first decision changes the recommendation to science; tour skip/replay/pause/resume work; prepared tour narration reports Speaking; saved decision survives reload; clock slider and night selection work.
- Visual inspection: healthy and damaged greenhouse retain original scene perspective; night variants remain legible. Separate test origin used to preserve the user’s mission save.
- At 390 CSS pixels, verified stacked difficulty cards, a persistent launch button, narrated tour steps and guided travel. Moved the clock into a slim row above the tasks to prevent overlap, and prevented the objective button from shrinking around its label. A development-only iframe fixture supplies an exact viewport because the browser's viewport override did not apply reliably.
- Physical-device performance and listening quality across all platforms are not certified by this pass.

All work remains local and uncommitted. Concurrent voice work in the shared workspace was preserved.
