# Visual sprint — completed implementation

15 November 2026. Built locally on `codex/mission-polish`; no commit, push or deployment.

## Delivered

- Character greetings now anchor above the clicked astronaut or Rocky, follow their canvas positions, and keep their pointing tail inside the viewport. Pointer entry is 160 ms; keyboard activation is immediate.
- Menus, HUD, choice cards, terminals and pause panels share dark glass surfaces, quieter borders, readable text and consistent primary/secondary buttons. Unsupported blur uses solid surfaces. Puzzle content remains opaque.
- Added a cached foreground layer over the existing painted base. Equipment states come from committed tasks, resources, flags, journal and sol log, rather than a second saved visual state.
- Greenhouse: matching healthy/wilted transparent tomato sprites, a separate spoiled-crop tray during the emergency, restored irrigation, and a fruitless new seedling after rescue. Spoiled fruit is cleared, not revived. Glass ribs and reflections render over the plants.
- Engineering: working turbine and output cells. Air & Water: frozen versus connected supply and visible circulation. Command: pending/resolved plan and shield status. Science: growing specimen rack. Medical: scan record and monitor. Kitchen: stocked/low/fresh tray. Crew quarters: rest/attention lighting. Storage/airlock: sealed returned samples. Hub: persistent sol lights. Exterior: dust actually covers the panels.
- Accepted tasks queue local workstation feedback and a short crew reaction until the base is active again. Restart clears pending effects. Loading a save derives the artwork without replaying task celebrations.
- The lettuce rescue uses a distinct wilted sprite, an aligned healthy-state crossfade, a brief specimen-docking response, and visible water reaching the roots during its labelled model time-lapse. Dragging and keyboard/click placement remain supported.
- Added “Around the base”: readable live room conditions, crew-specific navigation and a whole-base view. Choosing an astronaut returns to the normal camera zoom.

## Verification

- `npm test`: **33 checks pass** in the shared workspace, including three new room-state regressions, existing save/lifecycle checks, and 576 campaign simulations. The three room tests cover independent water/crop repair, restored journal/cargo/milestones, and resource-driven equipment/supply states. Other checks include the voice work already present in this workspace.
- Production build succeeds; `git diff --check` passes. Current full shared build: initial JavaScript 414.23 kB gzip; rover 159.87 kB gzip. New PNG assets total about 1.1 MB. This is not a measured FPS budget.
- Browser inspected healthy, damaged, restored, storm/dust, returned-sample and reduced-motion room scenarios in an isolated developer page that never changes the campaign save. Checked local crop-care feedback and close/overview camera changes.
- Completed the greenhouse interaction through `{done:true,mistakes:0}` with the new sprites, specimen drag, evidence, connector placement, pause holding recovery at 0%, resume, healthy result and recording the discovery. Browser testing caught and fixed an item-ID/element mix-up in docking. An optional completion control also now omits absent content instead of printing `undefined`.
- Checked Max and Rocky greetings, keyboard activation, screen-edge clamping and title layout at a measured **487 CSS px width**. Reset the temporary viewport override afterward.
- Checked new mission launch, “Around the base” descriptions and navigation to Lea's greenhouse. The isolated final preview reported no console errors. Earlier development logs retain the docking exception from before its fix; it did not recur on the complete rerun.
- Saved visual evidence: `visual-sprint/menu-after.jpg` and `visual-sprint/base-after.jpg`. The latter includes developer scenario controls, not production UI.

## Assets and scope

Built-in image generation produced `public/assets/visual/tomato-healthy.png`, `tomato-wilted.png`, `tomato-spoiled.png`, and `public/assets/greenhouse/lettuce-wilted.png`. Alpha was verified; delivered copies were resized mechanically to 512 px, preserving transparency. Prompt set and provenance: `public/assets/visual/README.md`. Full-size generated originals were retained.

The existing painted room architecture and friendly art direction remain. New foregrounds cover stateful portions of the painting; this is not a complete 3D environment replacement. Crop recovery is an explicitly labelled teaching model, not an instantaneous biological claim. The new room visuals reuse existing campaign rules/rewards; no extra compulsory mini-games were added.

Physical-device performance/touch testing, broad screen-reader review, and a complete manual five-sol playthrough remain release validation work. The visual sprint does not certify those checks.

Developer scenarios while Vite runs: `/tests/visual.html`; existing mission checks: `/tests/review.html`. Neither page is included in the production build. The temporary isolated testing server was stopped after verification; the normal game remains on port 5173.
