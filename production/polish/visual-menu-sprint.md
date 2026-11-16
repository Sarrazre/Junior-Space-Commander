# Visual menu sprint

15 November 2026. Implemented in `src/landing.js`, `src/landing.css` and new `src/visual-ui.css` (imported by landing).

- Character greetings now derive their position from the same canvas coordinates as the clicked astronaut or Rocky. The bubble follows hops, camera drift and Rocky's bounded flight, with a tail pointing to the speaker and viewport edge clamping. Layout is measured on greeting/resize; the frame uses transforms. Speaker name and greeting are distinct lines in an atomic live region.
- Pointer greetings enter in 160 ms with a 6 px rise using `cubic-bezier(.23,1,.32,1)`; keyboard and reduced-motion greetings appear immediately. Switching speakers cancels the previous entry. Greetings clear when entering intro, launch or leaving the title.
- Menus, small HUD surfaces, terminal chrome, choice cards, pause settings and Mission Control use restrained dark glass surfaces, thinner borders, subtle inner highlights and consistent primary/secondary buttons. Continue is the primary action when a checkpoint exists; New mission becomes secondary. Important readings retain solid dark backing.
- Blur is limited to supported browsers through `@supports`; opaque fallbacks remain. Readable font treatments, visible focus and existing control semantics remain. Removed perpetual title sheen/primary-action glow and Interact bounce; success and object state motion remain the meaningful focal points.
- Source syntax check, production build and `git diff --check` passed. Browser layout, different speaker positions, small-screen tail clamping and reduced-motion verification remain with the parent integration pass. No commits or external publishing.
