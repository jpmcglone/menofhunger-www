# Men of Hunger sound library

The web and iOS clients share the same audio assets. New WAV clips are original,
deterministic tones synthesized without third-party samples or dependencies.
Keep web `public/sounds` and iOS `MenOfHunger/Sounds` WAV/MP3 files byte-identical.
The catalog lives in web `utils/sound-policy.ts` and iOS `SoundCatalog.swift`.

## Incoming activity

| Cue | Actual event | Character |
| --- | --- | --- |
| `new-message.mp3` | Fresh incoming message in an accepted, unmuted conversation you are not viewing | Direct chat |
| `action-channel-message.wav` | New message in another group channel with preference "all" | Quiet tick |
| `action-channel-mention.wav` | Channel mention or followed reply; never when preference is "off" or the channel is viewed | Higher two-note ping |
| `group-activity.wav` | Group feed post/reply/mention and group membership/invite notifications | Warm rising major third |
| `board-activity.wav` | Notification about a Board thread or comment | Lower, slower fifth |
| `notification.mp3` | Other actual notification arrivals | General activity bell |
| `action-reaction.wav` | Someone else reacts to your message | Tiny soft pop |

Notification subject references choose the family; a plain reply does not sound like
Board or Groups unless it belongs there. The message notification itself is silent in-app:
the message socket event owns that cue. Badge/count updates and passive feed arrivals
never trigger alerts. Own, stale, duplicate, silent-update, and reconnect-backlog events
stay quiet. Incoming conversations use current eligibility from a shared metadata cache,
even before the inbox is loaded. Expired or unknown metadata resolves through the existing
authorized detail endpoint; requests coalesce, the bounded cache expires after 15 seconds,
and a lookup taking more than 600ms cannot announce the old event.
Channel mentions may bypass a temporary ordinary-message mute, matching
server delivery policy; a channel with preference "off" stays fully silent.

APNs uses bundled `new-message.caf`, `channel-message.caf`, `channel-mention.caf`,
`group-activity.caf`, `board-activity.caf`, and `notification.caf`. The API derives the
family from actual kind and internal post/group context. Foreground iOS push presentation
is silent because the socket owns foreground sounds. Browser Web Push uses the browser's
system sound; it cannot choose a custom audio clip.

## Deliberate actions and presence

- `action-publish.wav`: soft wooden pop after an acknowledged post/reply.
- `action-checkin.wav`: warm completion chime, replacing the publish pop for a check-in.
- `action-feed-reveal.wav`: light swish after tapping New posts.
- `action-record-start.wav` / `action-record-stop.wav`: high/low ticks outside microphone capture.
- `action-upload-ready.wav`: completed standalone upload that took at least three seconds.
- `action-save.wav`: quiet fitness confirmation.
- `action-message-sent.wav`: acknowledgement of a successful chat/channel send.
- `chat-open.wav`, `chat-minimize.wav`, `chat-close.wav`: quiet related dock action motifs.
- `presence-join.wav`, `presence-online.wav`, `presence-offline.wav`, `presence-follow.wav`:
  existing map and followed-online motifs, shared as files rather than separate synths.

All web clips are bundled on iOS. iOS uses `presence-follow.wav` for its followed-online
announcement and message-sent for the native chat send acknowledgement. Dock and map
motifs are available in the native catalog for parity; playback requires an actual native
equivalent action. This does not add a native desktop dock. Calls already have matching
native/web hangup synthesis and keep their call-specific audio routing.

One device-local Sounds toggle governs in-app cues. Hidden/inactive apps, occupied media,
recording, and calls stay silent. Async web playback rechecks mute, ownership, identity,
viewing state, and a 600ms deadline after decode. Presence and alerts are rate limited;
dock actions also share a 250ms minimum gap. iOS ambient playback respects the silent
switch. Visual feedback remains authoritative, and unavailable audio never fails an action.

## Reproduction

Run `python3 scripts/generate-action-sounds.py` from either client repository. The two
scripts are identical. Existing action clips remain unchanged; generated WAVs are mono
44.1 kHz / 16-bit PCM, 80–680ms, with faded endpoints and peaks no higher than 0.34.
Individual catalog gains keep deliberate dock/presence cues particularly quiet.

After changing an APNs alert clip, regenerate its CAF in the iOS repository:

```sh
afconvert -f caff -d LEI16 MenOfHunger/Sounds/group-activity.wav MenOfHunger/Sounds/group-activity.caf
afconvert -f caff -d LEI16 MenOfHunger/Sounds/board-activity.wav MenOfHunger/Sounds/board-activity.caf
```

Xcode's filesystem-synchronized `MenOfHunger` folder automatically includes these resources.
Native catalog tests verify bundled resources and decode the shared WAV assets; web tests
cover actual event routing, preference/viewing suppression, and delayed-playback guards.
