# SAIKO BEAT PIANO RUSH – v0.4 QA and release gates

Updated: 2026-10-31 (JST). This is an **Android debug prototype**, not a finished or commercially cleared product.

## What CI actually proves

- Android app source compiles into a debug APK (GitHub Actions: `SAIKO BEAT Android APK`).
- `tests/validate-piano.cjs` covers four lanes, perfect/good/miss, score/combo, no duplicate points, measured-waveform sustained holds, early release, pointer cancellation, and pause cancellation.
- `tests/validate-piano-web.cjs` drives the actual browser app with a generated original PCM buffer and an authorized local-audio mock: onset analysis, note generation, WebAudio source playback, and pointerdown score.
- The native Java code uses `MediaCodec` to decode the selected/downloaded audio, `MediaPlayer` to play the same cached file, and `MediaPlayer.getCurrentPosition()` as the timing clock. These behaviors are **compiled but not yet observed on a Galaxy**.
- No YouTube video iframe is shown. A browser version can analyze authorized user-selected audio without downloading YouTube media.

## Unverified – must pass on physical Galaxy

1. **Original song**: Install the latest debug APK; select beginner, tap "すぐにプレイ". Verify audible original music, visible falling tiles, four-column tap, score/combo, and result screen.
2. **Licensed local song**: Tap "音楽ファイルを選んで遊ぶ" and choose a personally owned/authorized 5–600-second MP3/M4A/WAV file below 48 MiB. Verify native file picker, actual native MediaCodec onsets, sound playback, and chart. Repeat for at least three codecs and two devices.
3. **Timing**: Film the Galaxy at 120/240 fps (or use an audio loopback rig), compare sound transients to tile hit line and judge result. Target median absolute offset <=50 ms, 95th percentile <=90 ms after device calibration; these are **targets, not measured results**. Verify calibration +/−200 ms moves judgment in the intended direction.
4. **Holds**: With a sustained note, hold finger through the end (success); release early (MISS); use two fingers in separate lanes; switch apps mid-hold (no free score).
5. **Lifecycle**: Pause/resume, lock screen, incoming call, background/foreground, file-picker cancellation, repeated song loading, track completion (result screen must appear), memory pressure and app exit (cache deletion).
6. **YouTube diagnostic only**: Test two **owned and permitted** video URLs. Record the failure stage (metadata, HTTP/socket, MediaCodec, MediaPlayer), audio start, note timing. `NewPipeExtractor` may fail due to YouTube bot protections, 403/429, codec or network changes. **No successful real YouTube song test has been demonstrated by CI**.
7. **Rights/terms**: Do not distribute a YouTube audio-only extractor as a commercial feature without provider permission and a documented legal basis. Use a licensed catalog or authorized user-selected audio. No monetization, store publication, or paid service until approval.

## Known limitations

- Beat detection is energy/transient based, not polyphonic music transcription. Some songs produce sparse or imperfect note patterns; long notes are conservatively derived from sustained PCM energy.
- Device output latency, Bluetooth headphones and Android MediaPlayer position granularity can cause offset. The in-game calibration is an aid, not proof of synchronization.
- Native local-file selection is SAF/URI-based; file bytes are capped at 48 MiB, cached privately, and deleted on replacement or app teardown. No file is uploaded.
- GitHub Actions debug builds may use different auto-generated signing keys between runs. Installing over a previous debug build can require uninstalling the old test app, which clears its local best scores.
- Debug APK is not a signed production release; no store listing or paid rollout has been authorized.

## Safe release gate

Require a repeatable physical-device test log with device model, Android/WebView version, audio format, track duration, detected note count, measured offset and pass/fail for every item above. Merge PR #17 only after review; do not label the prototype "finished" on CI success alone.
