# Rocky and station controls — 15 November 2026

Rocky keeps the existing authored, mission-specific guidance and prepared narration. No LLM or external chat service was introduced.

- Stable responsive bottom dock groups station views, crew selection, and Rocky. Station interaction has its own space above the dock.
- Whole base / Follow crew toggle fits the complete station above the controls, preserves the prior task-panel state, and survives viewport changes. Selecting or routing a crew member restores following.
- Remote Control opens the existing telemetry dashboard without allowing remote mission decisions. Its route button brings Max to the real command terminal.
- R: Rocky; V: panorama; C: dashboard; E / Space: interact; 1–4: crew. Text inputs and modifier shortcuts are protected. Tab and Enter still activate native controls.
- Rocky offers a priority-task route, controls help, and a quiz. Seven authored questions include two flight basics and one for each completed science discovery. Newly unlocked questions come first; subsequent questions rotate by session practice count. Feedback explains the answer; no resources, scores, or mission saves change.
- The existing robot artwork rests in the dock and flies into its speech bubble on pointer activation. Keyboard interactions and reduced-motion preferences skip the flight.

Validation: all 42 automated tests passed; production build passed. Browser checks covered desktop and a 390 × 844 phone frame, keyboard R/V/C/E, the priority route and station arrival, remote versus terminal dashboard actions, incorrect-answer feedback, focus handling, and the full-base camera. No browser errors were recorded in the checked desktop page.

Preview: first-flight/mission-dock-preview.jpg. Work remains local and uncommitted.
