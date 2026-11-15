# Living room visuals — 15 November 2026

Implemented in `src/room-visuals.js`, `src/data/room-visual-state.js` and `src/base.js`.

- Added a cached foreground texture for physical changes to Command's decision display, the laboratory specimen rack, Medical's scan record, Engineering's output turbine/cells, the Air & Water connector, Crew Quarters rest lighting, Kitchen produce tray, Storage sample cargo, Hub sol lights and the exterior solar-panel dust layer.
- Replaced the permanently healthy baked greenhouse crop region with a dark hydroponic bed, generated independent tomato plants, plumbing and foreground glass ribs/reflection. Unresolved Sol 3 damage remains visible on later sols. Water and crop repair are separate. Damaged fruit/crop in the quarantine tray disappears after rescue; a smaller replacement planter conveys regrowing crop rather than reviving spoiled fruit.
- Added slow turbine/water/scan movement tied to their equipment state. Reduced motion preserves all state information while removing rotation/sway/travel. Paused, hidden or busy base states do not advance this module's animation clock. Foreground texture redraw is keyed to discrete visual state, not every frame or resource point.
- `base.taskComplete(task)` queues a short local workstation confirmation plus a crew wave until the base can receive input again. It is called by the mission controller after accepted completion, never inferred from a save, so loading a checkpoint does not replay rewards. `base.describeRooms()` provides 11 plain-language descriptions for a parent-owned accessible room overview.
- New state derivation tests cover independent greenhouse/water repair, persistence after Sol 3, reconstructed journals/cargo/mission lights, threshold resource states and rest periods. Three tests passed. Initial production build succeeds. Parent owns final integration/browser verification and generated-asset validation.

This layer extends the painted base; it is not a full reconstruction of every room. Machine housings and glass are code-native artwork. Existing background room signs remain baked into the image. No new economy or task rewards were added.
