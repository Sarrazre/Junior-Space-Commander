# Junior Space Commander — submission preparation

Prepared 15 November 2026 for **Build a Junior Astronaut Mission Trainer**.

This file is a copy-ready project narrative plus a final handoff checklist. It is not confirmation that a project has been submitted on the Space Apps website. Team and registered-event details are intentionally left blank at the owner’s request. Add them before filing the official project.

Hosted game: https://junior-space-commander.sentientstudios.chatgpt.site

Sites confirmed public production deployment on 15 November 2026. Browser validation and the exact release version are recorded in RELEASE.md. Source download: https://junior-space-commander.sentientstudios.chatgpt.site/source.zip .

## Project name

Junior Space Commander

## One-sentence pitch

Run a Mars outpost for five sols, lead four astronaut specialists, and discover how power, food, shielding, crew health, and science compete for the same limited resources.

## Short summary

Junior Space Commander turns mission trade-offs into a playable story for young learners. Players lead an engineer, doctor, scientist, and botanist through five Martian sols, making daily decisions and completing hands-on experiments. A dusty solar array, cold greenhouse, and radiation alert make every choice matter. Rocky provides authored, mission-aware guidance, spoken instructions, and science reports. A live station dashboard and changing room visuals connect actions to consequences. NASA space-weather information and cited science inspire the lessons, while invented game values are clearly distinguished from real measurements.

## Project description

A space outpost succeeds through many small decisions. Heating the greenhouse helps the food supply but consumes power. Keeping the lab fully powered protects the day's science opportunity, but energy also supports the crew. Cleaning dusty solar panels can restore generation, while outdoor work introduces a health cost. Junior Space Commander lets learners make these choices and see the consequences across a five-sol Mars campaign.

The crew gives each responsibility a human face: Max handles engineering and the daily command decision; Elsa monitors crew health; Charles investigates rocks, samples, and radiation evidence; Lea cares for the greenhouse. Players choose a task, travel to the appropriate room, and interact with its equipment. Mini-games include engineering repairs, medical observations, plant investigations, and rover fieldwork. The two rover missions already existed in the original project and are part of the complete game: soil sampling on Sol 1 and a final expedition with weather, photography, and meteorite activities.

The central learning loop is **observe → choose → act → check the result**. The greenhouse investigation asks learners to inspect evidence, form a hypothesis, restore a missing water connection, and compare recovery against a reference plant. The station dashboard exposes reserves, warnings, and trends. Day/night artwork, dust, equipment feedback, and crop states make mission conditions visible. The Earth/Mars clock demonstration teaches why the two planets' days drift apart.

Beginner mode protects learning progress, while Advanced adds tighter resource and mastery pressure. Rocky offers context-specific guidance and prepared speech, and a discovery journal. Rocky uses authored game logic rather than an open-ended language model. Touch buttons, keyboard controls, device-based reduced motion, volume settings, and an automatic field-instrument fallback when 3D graphics are unavailable support different ways to play. Device-local checkpoints let players continue a mission later.

The game aims to help learners explain a trade-off and support a decision with evidence. It is an educational prototype, not a physical outpost simulator or operational astronaut training system. No learning-effectiveness study has yet been conducted.

## How it addresses the challenge

| Challenge theme | Implemented experience | What the learner can practise |
| --- | --- | --- |
| Run a lunar or Martian outpost | Five-sol campaign at a fictional Mars base | Coordinate several responsibilities over time |
| Competing power demands | Power overload, lighting/heating choices, panels and generator tasks | Compare a short-term benefit with its later cost |
| Life support and crew safety | Crew-health reserve, medical tasks, Air & Water repair, overnight consequences | Connect upkeep and environmental protection to health |
| Radiation shielding | Sol 4 shielding decision, radiation badges and biosensor lesson | Distinguish monitoring evidence from protection |
| Food production | Greenhouse tending, harvest lesson and investigation | Test an explanation and verify a repair |
| Tangible, engaging trade-offs | Previewed resource changes, science caps, dashboard and sol summaries | Recognise that useful choices may have different costs |
| Communication delay | Sol 5 report selects recorded discoveries and sends them over an accelerated Mars–Earth radio link | Understand why the crew must act independently while messages travel |
| Youth-friendly interaction | Role-based crew, illustrated base, contextual hints, prepared voice, science reports | Learn by acting, observing, and reflecting |

The complete official Details and Resources tabs were inspected in a browser on 15 November 2026. The stated audience is ages 7–12. The game addresses the listed life-support, radiation, power, food-production and communication-delay themes. Dataset grounding and traceable attribution are encouraged; not every listed resource needs to be integrated. Authenticated submission-form fields remain unverified.

Challenge: https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/

## NASA and partner science: what is actually used

The game makes one runtime NASA data request: DONKI solar flares. Other cited resources support authored educational explanations and simplified models; they are not live dataset imports. In particular, the game does not numerically analyse OSDR or RadLab datasets and does not use Mars Trek terrain tiles for the rover.

| Resource | Use in the game | Boundary to state clearly |
| --- | --- | --- |
| [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Sol 4 displays the strongest valid flare found in the preceding 30 days through NASA's FLR endpoint | A recent Earth-observed solar flare is educational context, not the measured radiation dose at the fictional Mars base |
| [NASA CCMC May 2024 storm record](https://ccmc.gsfc.nasa.gov/storms/may2024/) | Explicitly labelled historical X8.7 example when the API is unavailable, empty, or invalid | A historical example is not presented as live |
| [NASA OSDR](https://osdr.nasa.gov/bio/repo/), OSD-980 | Bone-health lesson inspired by a mouse unloading/temperature study | Mouse results are distinguished from astronaut results; game values are invented |
| NASA OSDR, OSD-412 | ISS leafy-greens microbiome lesson | The game contamination alert is fictional; it does not claim the real harvest was unsafe |
| NASA OSDR, OSD-581 | Regolith/plant-growth educational background retained in the botany module | The active greenhouse rescue uses a fictional irrigation investigation; it does not reproduce a measured compost treatment or claim NASA observed this lettuce rescue |
| NASA OSDR, OSD-346 | Gravity Garden lesson inspired by seedlings grown at different gravity levels | Bending graphics are a simplified teaching model |
| NASA OSDR, OSD-964 | BioSentinel yeast/radiation lesson | Shelter choice, shields, puzzle wells, and scores are game mechanics |
| NASA OSDR, OSD-658 | Plant DNA repair lesson | The letter puzzle is an educational analogy |
| [NASA RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | Radiation-monitoring reference | ISS measurements are not described as Mars-surface measurements; no runtime RadLab feed is used |
| [NASA Martian blueberries](https://science.nasa.gov/resource/martian-blueberries-2/) | Rock-scanner evidence lesson | Mineral clues support hypotheses about environments, not proof of life |
| [NASA Mars facts](https://science.nasa.gov/mars/facts/) | Gravity, volcano, atmosphere and weather explanations | Mission weather is authored, not a live Mars forecast |
| [NASA/JPL Mars at a glance](https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance/) | Mean solar-day comparison (24 h 39 min 35 s, rounded to a second) | The Mars clock is a teaching clock aligned at first visit, not local solar time at a real landing site |
| [NASA Opportunity](https://science.nasa.gov/mission/mer-opportunity/) | Dust and solar-generation lesson | Simplified mission consequences are invented for play |
| [NASA Curiosity sunset](https://science.nasa.gov/resource/curiosity-rover-views-a-martian-sunset/) | Final-sol science fact | Decorative sky and base illustrations are fictional game artwork |
| [CSA Food Production toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/) | Space-food and greenhouse explanations | Recovery readings and time-lapse are invented teaching models |
| [University of Minnesota hematite guide](https://commonminerals.esci.umn.edu/minerals-g-m/hematite) | Mineral-magnetism clarification | Iron content alone is not used as proof a sample attracts a hand magnet |

The individual OSDR accession interpretations above are the documented inspirations in the current source. Review the linked OSDR repository entries before making additional study-specific claims in a presentation.

## Technology and resource acknowledgements

- Original project and source: https://github.com/Sarrazre/Junior-Space-Commander/ . This submission builds on that project. Preserve upstream project credit. On 15 November 2026 the owner confirmed that the original code, artwork and intro were created by the team and that reuse rights are held.
- JavaScript, Vite, Phaser and Three.js power the browser application and 2D/3D scenes. List their shipped licenses with the release.
- SI-generated / SI-assisted code and fictional game content: OpenAI Codex and Anthropic Claude assisted implementation, review, debugging, tests, design iteration, documentation and release preparation. Code/data disclosure is also in HTML metadata, package.json and public/SI-USE.json.
- OpenAI image generation created or edited selected fictional greenhouse specimens and base lighting/damage variants. These images have visible SI-generated watermarks. Kling generated the intro video, identified by its AIGC metadata; it carries a visible SI-generated watermark throughout playback. Asset prompts/provenance are recorded in `public/assets/greenhouse/README.md`, `public/assets/visual/README.md`, and `production/polish/FIRST-FLIGHT-AND-ATMOSPHERE.md`. These assets are not NASA photographs.
- Tiny Voca and Dizione by Muhammed Nazeem (n4ze3m) provide synthetic speech. Rocky uses M2; Mission Control uses F2. Prepared MP3 speech is bundled; no voice cloning, personalized generation, model download or inference runtime is included. The authored guidance does not use an LLM, train on children, or listen through a microphone.
- Narration is SI-generated, acknowledged in credits text, the voice manifest and each MP3’s ID3 metadata. Prepared narration provenance and retained offline-authoring license texts are supplied in `public/assets/voice/NOTICE.txt` and its referenced files. Browser synthesis workers and inference models are not distributed.
- Original station/menu backgrounds and mission logo are inherited from the team’s upstream game. The team confirmed their AI origin and ownership/reuse; original generation tools were not recorded. These files have visible SI-generated watermarks. The intro’s Kling generation metadata is confirmed. Do not attribute fictional artwork to NASA.
- Fonts used by the source are Baloo 2 and VT323, requested through Google Fonts. Include their upstream font-license notices in the release if self-hosting or bundling them.

## Honest limitations

- Resource amounts, healing/treatment effects, shielding systems, delays, rewards and thresholds are invented game abstractions, not validated engineering or medical guidance.
- NASA API availability is optional: the historical fallback preserves the lesson. `DEMO_KEY` can be rate limited.
- The rover world is a fictional, generated environment, not a reconstruction from NASA terrain data.
- Saved progress belongs to the current browser/device. Clearing site storage, switching devices, or using another origin does not carry the checkpoint over.
- Full offline first launch is not guaranteed. Browser capabilities and network conditions affect optional speech and 3D features.
- There is no classroom account system, teacher dashboard, or cross-device learner profile. Do not claim those features.
- Do not claim a measured learning improvement, universal accessibility compliance, or NASA endorsement.

## Demo sequence for judges

1. Show the mission selection cards and explain Beginner versus Advanced.
2. Start a guided mission. Use the objective to send Max to the Command Center.
3. Show the power-overload options and their visible costs. Pick one, then show the updated dashboard.
4. Switch crew and complete a science interaction. Point out the distinction between a real reference and invented game values.
5. Summon Rocky, use the route button, and show the contextual task guidance.
6. Toggle Whole base and open Control to show how state remains legible.
7. Show a rover mission and the greenhouse investigation using a separate prepared demonstration session; do not overwrite the judging campaign save.
8. Finish with the discovery cabinet, five-sol progression and Sources screen.

### Optional short voiceover

“Could you keep a Mars outpost alive? In Junior Space Commander, four astronaut specialists share limited power, food, shielding, and crew health. Every sol brings a trade-off. Repair the greenhouse, investigate evidence, and explore with the rover. Rocky guides young learners with spoken hints and science reports. NASA science and clearly labelled space-weather data connect the adventure to real exploration.”

This is suggested presentation copy, not a claim that a particular video duration is required. Verify the current project form before recording or uploading.

## Final handoff checklist

### Project and deployment

- [x] Hosted URL inserted. Public access confirmed by Sites policy and anonymous browser-style HTTP requests; a second physical device has not been tested.
- [x] Release provenance is recorded in RELEASE.md; source is publicly downloadable at /source.zip. The upstream GitHub repository has not been updated by this publication.
- [x] Local and hosted checks are distinguished in RELEASE.md.
- [ ] Select screenshots that show actual gameplay, mission choices and trade-offs. Existing screenshots in `production/polish/first-flight/` can be reviewed for inclusion.

### Team-owner details and rights

- [ ] Confirm registered team name, selected challenge and Local/Universal Event; fill the actual project page. No team identity is assumed here.
- [x] Owner confirmed the team created and owns the original source, base artwork and intro media. Agency logos remain subject to agency terms.
- [x] MIT license added for team-authored code and documentation with owner authorization; other materials retain their own terms.
- [x] Third-party inventory, core dependency license texts and bundled voice notices included. Source-specific agency/font terms are linked.
- [ ] Review any personally identifying material and participant media before submission.

### Official submission

- [x] Read the live Details and Resources tabs.
- [ ] Inspect actual 2026 submission-form fields, limits, required links and media requirements with the registered team account.
- [ ] Check the selected event's deadline. The official [2026 overview](https://www.spaceappschallenge.org/2026/) states submissions close **15 November 2026 at 11:59 PM local time** and are made through the team's Project tab. The user's computer is in Europe/Berlin, but this does not establish the team's registered event or its applicable local deadline.
- [ ] Review the [2026 participant terms](https://www.spaceappschallenge.org/legal/). They require original-content availability and citation/license documentation for third-party materials; confirm eligibility and rights with the team owner.
- [ ] Paste the final narrative, source citations, deployed link and team details into the official form; review the exact content before submitting.
- [ ] Save the official receipt/status after submission. Hosting the game alone does not submit the project.

## Verification of official references

On 15 November 2026, the official 2026 overview confirmed the project-tab submission route and deadline. Although direct text retrieval failed, a browser successfully loaded the full challenge Details and Resources tabs. Listed resources: NASA Open APIs, DONKI, OSDR and its search API, RadLab, Mars Trek, CSA STEM/youth resources, and the CSA food-production toolkit. Authenticated form fields, media requirements, and character limits have not been inspected. Historical submission guides were not used as current-year requirements.

## Owner handoff update — 15 November 2026

The owner confirmed that all original repository content, base artwork and intro video were created by the team. Team name and registered local event are deferred. The owner authorized open-source release. Team-authored code and documentation now use the MIT license in LICENSE. Third-party components, fonts, agency materials and branding retain their own terms. The game was prepared and hosted; the official NASA project form has not been submitted.

## Use of Super Intelligence (SI) — submission response

Yes. OpenAI Codex and Anthropic Claude assisted code, game content, design iteration, testing and documentation. OpenAI image generation produced selected fictional plant art and base lighting/damage variants. Kling generated the intro video. Tiny Voca / Dizione generated the prepared narration. Generated images/video carry visible SI-generated watermarks; audio credits and embedded metadata acknowledge SI generation. Code/data disclosures and asset provenance are in Sources & SI use, project documentation, HTML/package metadata and SI-USE.json. NASA/CSA science sources are credited separately; fictional mission values are not NASA measurements.

Local disclosure changes are prepared for review and have not been deployed. The team confirmed AI generation of the original base, menu background and mission logo; their specific generation tools were not recorded.
