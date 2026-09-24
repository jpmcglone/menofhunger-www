#!/usr/bin/env python3
"""Original MOH action sounds, synthesized without samples or dependencies.

Run from either client repository. Pass an output directory to regenerate elsewhere.
16-bit mono PCM, 44.1 kHz; gentle attacks/releases, conservative peaks.
"""
import math
import pathlib
import random
import struct
import sys
import wave

RATE = 44100
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else (
    ROOT / "MenOfHunger/Sounds" if (ROOT / "MenOfHunger").exists() else ROOT / "public/sounds"
)


def tone(t, frequency, length, gain=1, start=0, decay=15):
    t -= start
    if not 0 <= t < length:
        return 0
    envelope = min(1, t / 0.006) * min(1, (length - t) / 0.025)
    envelope *= math.exp(-decay * t)
    # A soft wooden/mallet timbre; no piercing high harmonics.
    return gain * envelope * (
        math.sin(2 * math.pi * frequency * t)
        + 0.18 * math.sin(2 * math.pi * frequency * 2.01 * t)
    )


def render(name, length, sample, peak=0.32):
    data = [sample(i / RATE) for i in range(round(length * RATE))]
    # Remove DC, taper both ends, then normalize to a deliberately quiet peak.
    mean = sum(data) / len(data)
    data = [(v - mean) * min(1, i / 220, (len(data) - 1 - i) / 440)
            for i, v in enumerate(data)]
    scale = peak / max(abs(v) for v in data)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT / f"action-{name}.wav"), "wb") as out:
        out.setparams((1, 2, RATE, len(data), "NONE", "not compressed"))
        out.writeframes(b"".join(struct.pack("<h", round(v * scale * 32767)) for v in data))


render("publish", 0.16, lambda t: tone(t, 520, .16, decay=27))
render("checkin", 0.42, lambda t: tone(t, 523.25, .35, .7, decay=12)
       + tone(t, 783.99, .30, .55, start=.09, decay=13))
render("record-start", 0.095, lambda t: tone(t, 660, .095, decay=32), .24)
render("record-stop", 0.105, lambda t: tone(t, 440, .105, decay=30), .24)
render("upload-ready", 0.24, lambda t: tone(t, 659.25, .24, decay=18), .26)
render("save", 0.08, lambda t: tone(t, 392, .08, decay=38), .25)

rng = random.Random(20260924)
filtered = 0


def swish(t):
    global filtered
    filtered = filtered * .88 + rng.uniform(-1, 1) * .12
    return filtered * math.sin(math.pi * t / .18) ** 2


render("feed-reveal", .18, swish, .18)
