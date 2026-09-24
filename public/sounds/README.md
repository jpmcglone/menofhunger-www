# In-app notification sounds

These play when a new event arrives and the tab is visible:

- `notification.mp3` — bell / activity
- `new-message.mp3` — chat

If a file is missing, the app stays silent and does not error. Keep these identical to
`menofhunger-ios/MenOfHunger/Sounds/` (APNs uses CAF copies of the same clips).

## Action sounds

`action-*.wav` are original, deterministic synthesized sounds created for Men of Hunger.
No third-party samples or licenses. Regenerate with `python3 scripts/generate-action-sounds.py`
from either client repository; keep both generators and WAV copies identical.
Mono 44.1 kHz / 16-bit PCM, 80–420 ms, faded endpoints, peaks at or below −9.9 dBFS.
Playback applies an additional 0.7 gain.

- publish: soft wooden pop after an acknowledged post/reply
- checkin: warm two-note completion chime, replacing the publish pop
- feed-reveal: light swish only when the user taps New posts
- record-start / record-stop: distinct high/low ticks outside microphone capture
- upload-ready: soft tone after a successful upload that took at least 3 seconds
- save: quiet fitness confirmation click

Action sounds default on, with a device-local Settings toggle. They do not change
notification/message sound preferences. Hidden/inactive apps and occupied media/call
sessions stay silent; iOS uses ambient audio to respect the silent switch.
Visual feedback remains authoritative. Failed/cancelled actions and passive feed arrivals
do not play success sounds. iOS publishing already includes its upload, so its single
publish cue confirms both; the standalone upload cue is used for profile media.
