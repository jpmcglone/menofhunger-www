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


def render(name, length, sample, peak=0.32, prefix="action-"):
    data = [sample(i / RATE) for i in range(round(length * RATE))]
    # Remove DC, taper both ends, then normalize to a deliberately quiet peak.
    mean = sum(data) / len(data)
    data = [(v - mean) * min(1, i / 220, (len(data) - 1 - i) / 440)
            for i, v in enumerate(data)]
    scale = peak / max(abs(v) for v in data)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT / f"{prefix}{name}.wav"), "wb") as out:
        out.setparams((1, 2, RATE, len(data), "NONE", "not compressed"))
        out.writeframes(b"".join(struct.pack("<h", round(v * scale * 32767)) for v in data))


render("publish", 0.16, lambda t: tone(t, 520, .16, decay=27))
render("checkin", 0.42, lambda t: tone(t, 523.25, .35, .7, decay=12)
       + tone(t, 783.99, .30, .55, start=.09, decay=13))
render("record-start", 0.095, lambda t: tone(t, 660, .095, decay=32), .24)
render("record-stop", 0.105, lambda t: tone(t, 440, .105, decay=30), .24)
render("upload-ready", 0.24, lambda t: tone(t, 659.25, .24, decay=18), .26)
render("save", 0.08, lambda t: tone(t, 392, .08, decay=38), .25)
render("message-sent", 0.09, lambda t: tone(t, 587.33, .09, decay=34), .2)
render("reaction", 0.12, lambda t: tone(t, 880, .12, .8, decay=30)
       + tone(t, 1318.51, .08, .35, start=.02, decay=40), .16)
render("channel-message", 0.11, lambda t: tone(t, 698.46, .11, decay=30), .22)
render("channel-mention", 0.34, lambda t: tone(t, 783.99, .2, .8, decay=14)
       + tone(t, 1174.66, .3, .7, start=.1, decay=11), .34)

rng = random.Random(20260924)
filtered = 0


def swish(t):
    global filtered
    filtered = filtered * .88 + rng.uniform(-1, 1) * .12
    return filtered * math.sin(math.pi * t / .18) ** 2


render("feed-reveal", .18, swish, .18)

# Alert family: a round major third for the group feed; a lower, slower fifth for Board.
render("group-activity", .38, lambda t: tone(t, 523.25, .25, .8, decay=13)
       + tone(t, 659.25, .30, .6, start=.08, decay=12), .28, prefix="")
render("board-activity", .44, lambda t: tone(t, 293.66, .32, .8, decay=10)
       + tone(t, 440, .32, .6, start=.12, decay=11), .28, prefix="")

# Shared dock and presence assets replace client-specific runtime synthesis.
# Preserve the existing frequencies, timings, and gains; all clips have faded endpoints.
def motif(name, notes):
    length = max(start + duration for _, start, duration in notes)
    render(name, length, lambda t: sum(
        tone(t, frequency, duration, start=start, decay=9.2 / duration)
        for frequency, start, duration in notes), .32, prefix="")

motif("chat-open", [(523.25, 0, .12), (659.25, .055, .17)])
motif("chat-minimize", [(440, 0, .12), (329.63, .06, .17)])
motif("chat-close", [(392, 0, .16), (261.63, .07, .17)])
motif("presence-join", [(523.25, 0, .32), (659.25, .09, .32), (783.99, .18, .5)])
motif("presence-online", [(659.25, 0, .22), (880, .1, .34)])
motif("presence-offline", [(440, 0, .24), (329.63, .12, .4)])
motif("presence-follow", [(783.99, 0, .2), (1046.5, .1, .42)])
