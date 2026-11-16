# Voice verification — 15 November 2026

## Shipped assets

- 107 prepared Tiny Voca clips, approximately 4.9 MB and 602 seconds total.
- All files decoded successfully; no silent or non-finite audio. Maximum decoded
  sample amplitude after limiting: 0.841. This is a signal check, not a listening review.
- Five science explanations: 24.25–26.29 seconds each.
- Optional runtime/model/dictionary assets: 63,900,343 bytes (63.9 MB decimal,
  60.9 MiB), before transport compression; includes dependency licenses in the
  dictionary directory. Actual network transfer depends on hosting compression
  and cache state. Prepared clips are downloaded separately as needed.

## Automated checks

- 34 Node tests passed, including campaign checkpoint paths and voice policy,
  cancellation, hint progression, bounded cache, and manifest/audio checksums.
- Production build passed; `git diff --check` passed.
- Browser checks cover generated speech and prepared playback, help pause/resume,
  stable hint replay, teardown, real title-screen launch and Rocky briefing,
  mobile-width layout, missing audio, worker failure, and blocked local storage.
- Tested local desktop engines: Chromium, Firefox 151, and Playwright WebKit
  26.5. These are automated engine checks, not certification of installed Safari
  or physical Android/iOS devices.

Representative local measurements on this Apple Silicon Mac (not network or
mobile benchmarks):

| Engine | Preloaded clip start | Runtime initialization | Short dynamic line |
| --- | ---: | ---: | ---: |
| Chromium | 0.2 ms | 2.08 s | 97 ms |
| Firefox | <1 ms | 6.19 s | 782 ms |
| WebKit | 1 ms | 1.81 s | 82 ms |

The dynamic sentence was “Max has twenty two power points. Check the regolith
sample.” Time measures request to first sentence playback, after initialization.
Prepared start measures scheduling after decoding/preloading, not hardware sound
output latency. Tests ran against a local Vite server with live reload disabled.

## Remaining real-world checks

- Human listening review of both voices, scientific names, and expressive lines.
- Physical Android Chrome and iOS Safari, installed desktop Safari, phone memory
  pressure, slow-network download timings, and sustained rover frame-rate profiling.
- A completely uncached offline site cannot boot without the game itself being
  available. Full offline gameplay is outside this integration. Missing speech
  assets do not block the loaded game.

The implementation does not add a microphone, backend inference, external text
generation, or account requirement. No deployment or Git commit was performed.
