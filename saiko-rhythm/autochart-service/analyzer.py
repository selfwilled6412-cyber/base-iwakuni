"""Generate timestamped 4-lane rhythm charts from decoded audio, not from BPM grids.

The scorer in youtube.js expects note times in seconds. This module receives only
raw, mono float32 PCM. It does not fetch YouTube or inspect a browser player.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

SAMPLE_RATE = 11025
MIN_SECONDS = 5.0
MAX_SECONDS = 600.0


@dataclass(frozen=True)
class Beat:
    time: float
    lane: int
    strength: float


def detect_beats(samples: np.ndarray, sample_rate: int = SAMPLE_RATE, level: str = "normal") -> list[Beat]:
    if level not in {"easy", "normal", "hard"}:
        raise ValueError("Unknown level")
    if not isinstance(samples, np.ndarray):
        raise ValueError("Missing decoded PCM")
    if sample_rate < 8000 or sample_rate > 48000:
        raise ValueError("Unsupported sample rate")

    samples = np.asarray(samples, dtype=np.float32)
    duration = len(samples) / sample_rate
    if not MIN_SECONDS <= duration <= MAX_SECONDS:
        raise ValueError("Audio must be between 5 seconds and 10 minutes")
    if not np.all(np.isfinite(samples)):
        raise ValueError("PCM contains invalid samples")

    # No fabricated beats when a clip is silent or has no identifiable accents.
    if float(np.max(np.abs(samples))) < .0015:
        return []

    win_size = 1024
    hop = 256
    window = np.hanning(win_size).astype(np.float32)
    n_frames = 1 + (len(samples) - win_size) // hop
    novelty = np.zeros(n_frames, dtype=np.float32)
    low_energy = np.zeros(n_frames, dtype=np.float32)
    mid_energy = np.zeros(n_frames, dtype=np.float32)
    hi_energy = np.zeros(n_frames, dtype=np.float32)
    energy = np.zeros(n_frames, dtype=np.float32)
    previous = None
    hz = np.fft.rfftfreq(win_size, d=1 / sample_rate)
    low_mask = hz < 180
    mid_mask = (hz >= 180) & (hz < 1700)
    hi_mask = hz >= 1700

    for i in range(n_frames):
        frame = samples[i * hop:i * hop + win_size]
        spectrum = np.abs(np.fft.rfft(frame * window)).astype(np.float32)
        energy[i] = np.sqrt(np.mean(frame * frame))
        low_energy[i] = spectrum[low_mask].sum()
        mid_energy[i] = spectrum[mid_mask].sum()
        hi_energy[i] = spectrum[hi_mask].sum()
        if previous is not None:
            # Spectral flux measures sharp changes in the actual recording.
            novelty[i] = np.maximum(spectrum - previous, 0).sum()
        previous = spectrum

    if float(np.max(novelty)) <= 0:
        return []

    # A 0.27-second neighborhood tracks the local noise floor across songs.
    history = max(5, int(.27 * sample_rate / hop))
    baseline = np.zeros(n_frames, dtype=np.float32)
    for i in range(history, n_frames):
        baseline[i] = np.median(novelty[i - history:i])
    strength = np.maximum(0, novelty - baseline * 1.27)
    candidate_strength = strength[history:]
    if not np.any(candidate_strength > 0):
        return []
    peak_reference = float(np.quantile(candidate_strength, .94))
    threshold = max(peak_reference * .32, float(np.max(strength)) * .065)
    audio_floor = max(.002, float(np.quantile(energy, .72)) * .075)
    candidates: list[Beat] = []

    for i in range(history + 1, n_frames - 1):
        if energy[i] < audio_floor:
            continue
        if strength[i] < threshold or strength[i] < strength[i - 1] or strength[i] <= strength[i + 1]:
            continue
        # Timestamp refers to the center of the window; perceptual/audio offset
        # can be calibrated in the existing player's latency controls.
        seconds = (i * hop + win_size / 2) / sample_rate
        if not .10 <= seconds <= duration - .12:
            continue
        bands = (float(low_energy[i]), float(mid_energy[i]), float(hi_energy[i]))
        dominant = int(np.argmax(bands))
        # Four lanes, varying pitch / attack while staying deterministic.
        lane = (dominant + (len(candidates) % 2)) % 4
        candidates.append(Beat(round(seconds, 3), lane, float(strength[i])))

    minimum_gap = {"easy": .39, "normal": .21, "hard": .13}[level]
    deduped: list[Beat] = []
    for beat in candidates:
        if deduped and beat.time - deduped[-1].time < minimum_gap:
            if beat.strength > deduped[-1].strength:
                deduped[-1] = beat
        else:
            deduped.append(beat)

    if level == "easy":
        deduped = [Beat(b.time, 1 + i % 2, b.strength) for i, b in enumerate(deduped)]
    max_notes = {"easy": 350, "normal": 720, "hard": 1100}[level]
    if len(deduped) > max_notes:
        strongest = sorted(deduped, key=lambda b: b.strength, reverse=True)[:max_notes]
        deduped = sorted(strongest, key=lambda b: b.time)
    return deduped


def make_chart(samples: np.ndarray, sample_rate: int = SAMPLE_RATE, level: str = "normal") -> dict:
    beats = detect_beats(samples, sample_rate, level)
    duration = round(len(samples) / sample_rate, 3)
    if len(beats) < 4:
        raise ValueError("Not enough recognizable rhythmic accents in this recording")
    return {
        "version": 1,
        "duration": duration,
        "level": level,
        "source": "decoded-audio-transients",
        "notes": [{"t": b.time, "lane": b.lane} for b in beats],
        "note_count": len(beats),
    }
