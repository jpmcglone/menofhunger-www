# Voice playback and publication review — 2026-09-16

## Design

[Chat & voice in Figma](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=678-6)
contains recording, preview, upload/retry, message playback and persistent-player states,
with phone/desktop and light/dark examples. The canonical Catch-up component now uses
MARV's existing mark; its 24-point icon sits in a 44-point target.

## Playback contract

- A received voice message uses one shared player, which survives chat navigation.
- The app player exposes pause/resume, seek and stop. Stopping clears the source and metadata.
- iOS supplies Now Playing / Control Center / lock-screen commands. Web supplies Media Session
  where the browser supports it. Background web playback remains subject to browser/OS policy.
- Explicit playback replaces the current media owner. Feed autoplay yields to voice messages,
  including paused messages, so scrolling cannot unexpectedly take away Resume.
- Live calls can coexist with media playback. Voice, video, radio and Space playback replace one another.
  Recording cancels competing playback; calls reserve microphone capture and cancel an active recording.
- Recording is previewed before sending. The 120-second cap finishes into a draft; it never sends.
- Canceling a pending microphone permission request prevents a later permission grant from
  starting a hidden recording. Leaving the composer cancels and releases its recording resources.
- Backgrounding while recording finishes the preview. Received-message playback can continue.
- Failed web uploads retain the draft for retry. iOS uses the existing retryable outbox, which
  retains the local recording until success/discard/session reset.
- Logout/account changes stop media and clear voice metadata. Native interruptions and unplugging
  headphones pause voice playback instead of unexpectedly moving it to the speaker.
- On web, Spotify's cross-origin embed cannot report native media events to its parent. Entering
  its controls claims focus; switching media reloads that embed to stop it. On iOS, a WKWebView
  media-event bridge claims focus and pauses the provider player on handoff. Decorative avatars remain separate.

## Publication notifications

MCP `publish_post` uses the regular `POST /posts` endpoint. Delegated publication uses
`PostsService.createPost` / `publishFromOnlyMe`; scheduled posts replay
`PostsMutationService.createPost`. These paths already dispatch the normal `post.created`
side effect. No extra notification path or duplicate fan-out was added.

The concrete defect was page-operator suppression in both the follower fan-out and notification
writer. A person following a page can now receive `followed_post`, even when they operate that
page. This matters for scheduled/delegated posts they did not personally publish.

Unfollow/Off preferences, visibility rules, true self-notifications, post deduplication and
other operator-echo suppression remain in place. The fix affects future delivery; it does not
replay old notifications or publish a test post.

To investigate delivery: inspect the delegated run's published post ID, then the `post.created`
job in `moh_side_effects`, followed by `notification.push`. `/admin/jobs/queues` reports worker
count and waiting/failed depths. No workers means the queue is not being consumed.

## Device acceptance pass

1. Record, Stop, listen, scrub, Discard; repeat and Send. Deny microphone access and retry after allowing it.
2. Record to two minutes; verify a playable preview appears. Leave while permission is pending.
3. Play a received message, navigate to Feed, pause/resume/seek/stop from the persistent player.
4. Lock an iPhone and use lock-screen controls. Unplug headphones and confirm playback pauses.
5. Play another voice message, video or radio/Space stream: verify the new media replaces the old.
   During a live call, verify media can play and switch without ending or muting the call.
6. Scroll past autoplay videos during voice playback: voice keeps its focus.
7. Simulate upload failure, retry, and confirm one delivered message; switch accounts during playback.
8. Follow an operated page with Posts enabled, publish through its regular scheduled/delegated path,
   and verify the follower bell/push. With Off selected, verify neither notification is delivered.

References: [Apple audio sessions](https://developer.apple.com/documentation/avfaudio/avaudiosession),
[Apple remote commands](https://developer.apple.com/documentation/mediaplayer/mpremotecommandcenter),
[Apple media playback](https://developer.apple.com/documentation/avfoundation/configuring-your-app-for-media-playback),
[Web Media Session](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession),
[Web position state](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setPositionState).

## Verification performed

- Web: all 178 test files / 1,322 tests passed. After final refinements, the 85 focused voice,
  media-focus, embed and hydration-guardrail tests passed again. Typecheck and the final production build passed.
- API: 120 targeted tests passed, plus 12 MCP publication tests. Typecheck, build/module graph,
  admin route coverage and changed-file lint passed.
- iOS: final generic simulator build passed for arm64 and x86_64. All 13 focused simulator tests
  passed (confirmed in the saved Xcode result bundle), including real AVPlayer playback from generated silent
  audio, Now Playing metadata, pause/seek/rate and media handoff. Changed Swift files passed
  strict SwiftFormat and SwiftLint (zero violations). Phone/tablet-width rendered fixtures inspected.
- Browser: actual voice components rendered in an isolated local harness. Playback continued
  when the chat component unmounted; the persistent player paused from the feed; another media
  source stopped/dismissed the voice player. No microphone capture, uploads or messages were used.
- Figma dark/light layouts reviewed; preview sizing corrected so it does not overlap navigation.
- Web changed-file lint has zero errors and 31 existing warnings in surrounding code. Native build
  scripts also report existing formatting warnings outside this change. The iOS 27 simulator emits
  advisory warnings for synchronous AVAudioSession activation APIs still supported on the iOS 26
  deployment target; no playback-test failures occurred. Local Sentry release-upload attempts
  could not reach the service in the build environment; compilation and bundling completed.
- No Playwright suite was added or run. Physical-device background controls, microphone capture,
  actual push delivery, provider embeds and account/purchase flows were not exercised by these tests.
