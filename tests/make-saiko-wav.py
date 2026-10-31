#!/usr/bin/env python3
"""Deterministic original test music, no downloaded copyrighted media.

Creates 8-second mono WAV files at 16kHz with 15 real transient attacks.
Used only in debug APK emulator integration tests; no production assets.
"""
import math
import pathlib
import struct
import sys

destination = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("saiko-android/app/src/main/assets/qa")
destination.mkdir(parents=True, exist_ok=True)
sample_rate = 16000
seconds = 8
onsets = [0.8 + n * 0.42 for n in range(15)]


def samples():
    for index in range(sample_rate * seconds):
        t = index / sample_rate
        sample = 0.0
        for start in onsets:
            delta = t - start
            if 0 <= delta < 0.19:
                sample += 0.72 * (1 - math.exp(-delta * 180)) * math.exp(-delta * 17) * math.sin(
                    2 * math.pi * (350 + int(start * 25) % 140) * delta
                )
        yield max(-0.95, min(0.95, sample))


def write_wav(path, tag, bits, pack):
    pcm = b"".join(pack(x) for x in samples())
    fmt = struct.pack("<HHIIHH", tag, 1, sample_rate, sample_rate * (bits // 8), bits // 8, bits)
    chunks = b"fmt " + struct.pack("<I", len(fmt)) + fmt
    chunks += b"data" + struct.pack("<I", len(pcm)) + pcm
    path.write_bytes(b"RIFF" + struct.pack("<I", len(chunks) + 4) + b"WAVE" + chunks)
    print(f"{path}: {len(pcm)} PCM bytes, {len(onsets)} transients")


write_wav(destination / "fixture.wav", 1, 16,
          lambda x: struct.pack("<h", round(x * 32767)))
write_wav(destination / "fixture-24.wav", 1, 24,
          lambda x: int(round(x * 8388607)).to_bytes(3, "little", signed=True))
write_wav(destination / "fixture-float.wav", 3, 32,
          lambda x: struct.pack("<f", x))
