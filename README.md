# Junior Space Commander

A browser game for kids: lead four astronauts through five sols at Astro Base on Mars. Solve problems, make trade-offs between Power, Shielding, Food and Crew Health, and collect 50 science points. Built for a NASA hackathon.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. Add `?debug=map` to see the walkable areas drawn over the base picture.

## How it is organised

- `src/data/balance.js` – every game number (costs, gains, scoring)
- `src/data/sols.js` – the five sols: briefings, crises, tasks, fact cards
- `src/data/map.js` – walkable rooms, doors and stations of the 2D base
- `src/base.js` – the 2D base (Phaser)
- `src/rover.js` – the 3D rover mission (three.js)
- `src/minigames/` – the terminal mini-games
- `src/nasa.js` – NASA DONKI space-weather data (live, with a saved fallback)

## Science and data

Mini-games are inspired by NASA Open Science Data Repository studies OSD-980, OSD-412, OSD-581, OSD-346, OSD-964 and OSD-658. Game scores, costs, treatments and puzzles are invented for play and are not NASA measurements. See the in-game Data Sources screen for links.
