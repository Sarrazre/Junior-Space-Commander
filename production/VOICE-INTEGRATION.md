# Prepared narration

Rocky and Mission Control play authored MP3 recordings from
`public/assets/voice/clips`. The game has no voice-cloning or personalized
speech feature, no microphone input, and no downloadable inference model.
Existing saved preferences for personalized speech are ignored.

Settings retain Guided / On request / Off and voice volume. Speech bubbles use
one narration toggle. Missing recordings leave readable game text intact.
Closing a screen, pausing narration, or hiding the page stops playback; stale
clip downloads cannot start speaking after the screen closes.

## Assets and offline authoring

`manifest.json` identifies recordings by normalized text and speaker, with
hashes, byte sizes and optional timing segments. `script.json` records authored
lines. `node scripts/voice-assets.mjs` exports the finite script without
fetching models or runtimes.

The existing recordings were produced offline with Tiny Voca M2 (Rocky) and F2
(Mission Control), using Dizione. Provenance and license notices are retained in
`public/assets/voice/NOTICE.txt`; none of the inference assets is publicly
served. To deliberately rebuild recordings, separately obtain the pinned
Tiny Voca/Dizione authoring assets, set `JSC_VOICE_MODEL_DIR` to that local
folder, and run `scripts/generate-voice.py` in an environment with NumPy,
ONNX Runtime and ffmpeg. The authoring tool writes MP3s and the manifest only.
Its model inputs must stay outside `public`.

## Validation

`node --test tests/voice.test.js` checks prepared-recording integrity, audio
cancellation, optional unavailable recordings, fallback playback, preferences,
cache limits and ignored legacy personalized settings. The optional browser
check script covers prepared narration, hints, mute and failure handling.
