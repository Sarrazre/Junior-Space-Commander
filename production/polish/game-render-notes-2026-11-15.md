# Technical art, interaction and audio review — 2026-11-15

Scope: source and asset inspection, including direct visual inspection of `public/assets/base.webp`. This is an assessment, not a completed visual redesign. No listening test, mobile device test, frame-time capture, contrast measurement or full keyboard playthrough was performed in this specialist pass. Reports under `production/polish/` are human review records; no automated release gate consumes them.

## Direction

Keep the friendly cutaway Mars base, four colored crew roles and Rocky. The most valuable upgrade is a world that visibly reacts to the player's work: dusty panels become clean, weak plants recover, repaired systems light up, and expedition discoveries appear in the lab. This makes success legible and gives the player ownership of Astro Base. More decorative detail alone would not solve this.

The inspected base image already has a coherent chunky outlined illustration style. It also embeds English room labels, the title, lighting and furniture into one flat image. That makes localization, responsive text and object-state changes difficult. The procedural astronaut rigs in `src/base.js` have animated separate limbs and front/back sprites, so replacing them with single static generated images would lose expressive motion. Preserve that rig or supply compatible parts.

## Priorities and evidence

| Priority | Finding | Evidence | Recommended outcome |
|---|---|---|---|
| P1 | Interactive choices are not consistently keyboard controls | `src/main.js` builds crisis choices as clickable `div`; `src/minigames/index.js` uses clickable `div` cards when `cards` is true | Native buttons with visible focus, keyboard activation and disabled states. Offer select-item/select-slot as an alternative to dragging. |
| P1 | Shared modals do not establish accessible modal behavior | `src/ui.js` `modal()` only inserts a panel and toggles visibility | Labelled dialog, initial focus, focus containment and restoration; avoid activating the base through a modal. |
| P1 | Browser zoom is disabled and global touch handling is restrictive | `index.html` viewport disables user scaling; `src/style.css` sets `touch-action:none` on body | Allow browser zoom and scrolling in panels, restrict gesture capture to the playfield where required. |
| P1 | Motion has no reduced-motion path in inspected CSS | Pulsing warnings, bobbing interact/robot, shakes, flashing HUD, canvas loops in `src/style.css`, `src/fx.css`, `src/art.js` | Reduced-motion setting and OS preference support across CSS, Phaser and Three. Preserve state feedback with static symbols and text. |
| P1 | Task list names jobs but is not an actionable navigation surface | `src/main.js` renders tasks as `div` rows; `src/base.js` moves to station only after clicking the world | Clicking a task selects its crew member, highlights the station and offers a route. A clear current objective should persist above the detailed list. |
| P2 | Visual languages differ sharply between world and terminals | Painted base, smooth cartoon avatars, pixel font/scanlines, emoji and low-poly rover span `base.js`, `art.js`, `style.css`, `rover.js` | Keep terminals as an intentional in-world instrument style, but unify spacing, icon silhouettes, control states, typography hierarchy and crew colors. Use readable body text; reserve pixel lettering for short labels. |
| P2 | Medical UI risks teaching decorative readings as actual mechanics | `src/telemetry.js` explicitly derives display-only per-crew readings from shared health | Mark these as simulated readings and distinguish actual controllable resources. Explain the actual effect of treatment beside the action. |
| P2 | Text and decorative imagery are baked together | `public/assets/base.webp` includes title and room signs | Create a clean, text-free background in a later art pass and render localized labels independently. Preserve current room geometry and pathfinding unless deliberately reauthoring the map. |
| P2 | Intro has materially larger transfer cost than still assets | `public/assets/intro.mp4` about 9 MB; base 356 KB, landing 268 KB | Keep skip immediate, defer intro download when possible, show title on media failure and remember an opt-in replay choice. Measure cold start before setting a performance target. |

## Transparent asset pack worth producing

Generate and review one proof asset first: a greenhouse seedling with healthy and stressed variants. Integrate it into one working interaction before commissioning the full pack. The image generator can supply artwork; click zones, dragging, snapping, selection and scoring must still be implemented in the game.

| Pack | Deliverables | Integration value |
|---|---|---|
| Greenhouse specimen | Separate healthy/stressed/recovering plant cutouts and tray; common pivot and silhouette | Examine symptoms, choose treatment, see recovery. |
| Engineering kit | Cable ends, fuse, circuit board, coolant connector; idle/selected/error/installed states | Drag or click-to-place repairs with tangible parts and clear socket fits. |
| Expedition specimens | Basalt, layered rock, meteorite, sample vial; 6–8 distinct silhouettes | Collect in rover, label in lab, display in a persistent discovery cabinet. |
| Station states | Clean/dusty solar panel, powered/off generator, shield indicator | World visibly reflects mission decisions and completed work. |
| Rocky expressions | Neutral, curious, worried, celebratory portrait layers matching current blue face/white body | Contextual encouragement and more expressive briefings without replacing the existing mascot. |

Asset specification: transparent PNG or lossless WebP; one object per file; 512×512 source for small objects and 1024×1024 for larger objects, tested at actual 48–160 px display sizes; consistent three-quarter camera and upper-left lighting; navy outlines, restrained cyan/orange accents; no words, numbers, baked UI, drop-zone outlines or baked contact shadows. Keep 12–16% transparent padding, common per-family pivot and scale, and record attribution/provenance. Use a separate shadow layer. Verify alpha edges on light and dark backgrounds, no checkerboard pixels, no cropped extremities, and distinguishable states without relying on color. Atlas packing and runtime texture budgets follow only after an approved proof.

Interaction specification: hover/focus halo, pressed state, lifted drag preview, valid-target outline and a preview of placement. Invalid drop returns the item; it must never disappear. Provide click item → click slot and keyboard item/slot selection. Prefer a roughly 44–48 px interaction target even when art is smaller. Snap and celebrate correct placement with a short, restrained effect; wrong placement gets an explanatory hint, not only a red shake. Match hit zones to the task, not to every transparent pixel.

## Audio review

`src/audio.js` already provides synthesized music, named feedback sounds, music crossfades, fanfare ducking, a compressor, separate persistent music/effects volumes, mute, Rocky babble, speed-dependent rover motor and wind. Visibility changes suspend/resume the audio context. These are valuable foundations; replacing all sound is unnecessary.

Recommended next pass:

1. Establish an event inventory: hover/selection, valid/invalid placement, machine repair, sample secured, crew switch, crisis decision, checkpoint saved and day transition. Map each to one consistent sound family and a matching visible cue.
2. Add quiet room ambience—generator hum, greenhouse circulation, medical monitor—using distance or room state. Fade layers as the player moves; do not stack all rooms globally.
3. Keep the same musical theme but add/remove a small tension layer based on actual crisis state. Avoid permanent alarm intensity while the player reads.
4. Rate-limit repeated near-station and warning sounds. Current `main.js` fires `near` whenever the bridge reports an eligible station; confirm behavior at station boundaries during movement testing.
5. Expose an optional quieter-alerts setting and an independent Rocky voice/babble control. Add readable captions for any future voiced instruction.
6. Validate volume settings read from storage; currently stored music/sfx values are accepted with nullish defaults rather than range/type validation. The setter clamps values, but startup data may still be malformed.
7. Use the existing debug level meter for measured peaks/RMS while rapidly completing tasks, opening menus and entering/exiting rover missions. Test mute and sliders during video and synthesized audio; video is a separate sound path in `landing.js`.

Subjective mix quality, fatigue, loudness and speaker/headphone balance remain NOT ASSESSED — NO LISTENING DATA. No claim of clipping, pleasantness or perceptual balance is made here.

## Proposed acceptance checks

- A new player identifies the selected crew member and next destination without interpreting color alone.
- Every crisis and DOM card can be completed by keyboard, and closing the dialog restores useful focus.
- At 200% browser zoom, mission text and primary buttons remain reachable; test small landscape and portrait screens separately.
- Reduced-motion mode eliminates repeated bob/shake/pulse while preserving success, error and danger information.
- The seedling proof works by drag, click-to-place and keyboard, survives cancel/reopen, and displays correctly on light/dark surfaces.
- Repeated mission enter/exit does not accumulate audible loops; mute silences both video and game audio, and pause does not let hidden interactions fire.
- Verify room labels and collision geometry remain aligned after any background replacement.

## Readiness

NEEDS MORE WORK: concrete accessibility and interaction gaps above. Hardware performance, full visual regression, actual audio mix and younger-player usability remain unassessed. Use the proof asset plus one fully polished greenhouse mission as the visual/interaction reference before scaling to every mission.
