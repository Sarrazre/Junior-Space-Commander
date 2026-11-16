# Junior Space Commander — 30 s launch film

Picked storyline: **"Your first command"** — the result first, cut on the beat. A kid lands on Mars, is told they are the Commander, makes one hard call, then does the crew's jobs at speed, drives the rover, and is asked if they are ready for launch.

Not built (one line each):
- **Rocky's tour** — the robot mascot narrates one continuous walk through the base; slower, cuter, less gameplay.
- **Sol 4, radiation alert** — a single crisis told as a mini-thriller (alert → shielding choice → biosensor → safe); strongest story, shows only one sol.

```text
GOAL:    a judge or a 9-year-old thinks "I want to press Start mission"
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    30 s = 900 frames; game's own "rover" track, 138 BPM, bar = 1.739 s (52 frames)
LOOK:    the game itself, full frame — no backgrounds invented. Ink #ffffff, outline #1d2547 (game ink),
         one accent #ffd23f (game yellow) on one word per title. Display: Baloo 2 800 (the game's face),
         150–230 px, outline 16–22 px, hard drop 10 px, no blur, no glow.
MOTION:  titles slam: scale 1.5→1 in 5 frames (power4.out), exit 4 frames; logo spring back.out(2.2).
         Footage is real captured play, never re-timed; cuts land on bars / half bars.
SHOTS:   0–104     lander touches down (game intro film) · "YOU JUST LANDED ON MARS"
         104–209   the base, Max walks to Engineering · "4 ASTRONAUTS. 1 BASE." → "YOU'RE THE COMMANDER" · Rocky VO
         209–313   Power overload decision, cursor picks an option · "EVERY CALL IS YOURS"
         313–522   8 half-bar cuts: wires, panels, rocks, DNA, pipes, biosensor, drill, greenhouse · one verb each
         522–678   3D rover drive · "THEN DRIVE IT" → "20+ MISSIONS OF REAL MARS SCIENCE"
         678–757   real title screen, cursor travels to Start mission · Rocky VO "Ready for launch, Commander?"
         757–900   end card on the game's own landing art: mark springs in, wordmark, Space Apps line
BANNED:  dark void, glow, glass cards, invented UI, logo docked in a corner, text over a dimmed screenshot,
         NASA insignia (only the Space Apps mark that ships with the game)
QA:      f10 lander + title readable · f330 verb over wires · f600 rover + claim · f860 end card complete
```

Claims and their source: "4 astronauts", "5 sols", "50 science points" — README and title screen. "20+ missions" — 21 crew tasks in `src/data/sols.js` plus 6 rover field activities. "Inspired by NASA open science data" — README, "Science and data".
