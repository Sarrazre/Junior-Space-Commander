# Junior Space Commander

A browser game for kids: lead four astronauts through five sols at Astro Base on Mars. Solve problems, make trade-offs between Power, Shielding, Food and Crew Health, and collect 50 science points. Built for a NASA hackathon.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. Add `?debug=map` to see the walkable areas drawn over the base picture.

## Play and settings

Choose Beginner for more supplies and forgiving science scoring, or Advanced for fewer supplies and science points based on mistakes. Tap a task or the yellow Next button to select its astronaut and walk to the station. Press E or Interact on arrival.

The menu crew react when clicked; Rocky follows the pointer within his part of the scene. The intro starts automatically on every homepage visit, with sound enabled by a tap. It can also be replayed from the title screen. Settings includes music/effect volumes, Rocky voice and quieter alerts. Motion follows the device’s reduced-motion preference; rover missions automatically offer field instruments if 3D graphics are unavailable.

Completed tasks, decisions and sol transitions save on this browser/device. Continue resumes the latest checkpoint; an interrupted puzzle begins again. Starting a new mission or confirming Restart replaces the checkpoint. If saving is blocked, the game displays a warning; keep the tab open. A second tab with newer progress pauses the older session so it can return to the title and continue the newer checkpoint.

## Check the game

Rocky and Mission Control use prepared narration recordings. Settings offer
Guided / On request / Off and voice volume. The game has no voice cloning,
personalized voice download, or browser inference model. Science missions offer
layered Ask Rocky hints; help pauses the puzzle.
See `production/VOICE-INTEGRATION.md` for asset provenance and validation.

```bash
npm test
npm run balance
npm run build
```

While the development server runs, `/tests/review.html` provides isolated mission interaction checks without reading or writing the campaign save. It is not included in the production build. The current implementation and validation record is in `production/polish/IMPLEMENTED.md`; the original review is retained as a baseline.

## How it is organised

- `src/data/balance.js` – every game number (costs, gains, scoring)
- `src/data/sols.js` – the five sols: briefings, crises, tasks, fact cards
- `src/data/map.js` – walkable rooms, doors and stations of the 2D base
- `src/base.js` – the 2D base (Phaser)
- `src/rover.js` – the 3D rover mission (three.js)
- `src/minigames/` – the terminal mini-games
- `src/nasa.js` – NASA DONKI space-weather data (live, with a saved fallback)
- `src/state.js` / `src/save.js` – mission checkpoints and validated restoration
- `src/game-clock.js` – task-owned, pause-aware timing

NASA requests use `DEMO_KEY` by default. A local `.env.local` can set `VITE_NASA_API_KEY`; as with all Vite client settings, this value is visible in the built site. Unavailable or invalid responses use a clearly labelled historical example.

## Science and data

Mini-games are inspired by NASA Open Science Data Repository studies OSD-980, OSD-412, OSD-581, OSD-346, OSD-964 and OSD-658. Game scores, costs, treatments and puzzles are invented for play and are not NASA measurements. See the in-game Data Sources screen for links.

## Hosted game and submission

The full release is hosted with Sites at https://junior-space-commander.sentientstudios.chatgpt.site . Submission copy and the final checklist are in `production/submission/SUBMISSION.md`.

Use **R** for Rocky, **V** for the whole-base view, **C** for the control dashboard, **E / Space** to interact, and **1–4** to select crew. The bottom dock exposes these actions for touch and mouse.

Progress is saved to the browser and site where you play; localhost checkpoints do not transfer automatically to the hosted address. No account or LLM chat service is needed for gameplay. Narration uses prepared MP3 recordings and works without a model download.

The original game is from https://github.com/Sarrazre/Junior-Space-Commander/ . This release builds on that project. Third-party voice notices are in `public/assets/voice/NOTICE.txt`. The owner confirmed ownership of the original project and assets and authorized open-source release. Team-authored game code and documentation use the MIT license in `LICENSE`. Third-party software, NASA/CSA resources, fonts and branding retain their own terms.

Hosted release source download: https://junior-space-commander.sentientstudios.chatgpt.site/source.zip . Large media assets can be restored using `node scripts/fetch-release-assets.mjs`.

Charles begins with a rover soil survey on Sol 1, then uses the Rock scanner indoors on Sol 2. The full Sol report dashboard stays open until the player selects Start Sol 2 (or the next sol); that choice plays the transition animation.
