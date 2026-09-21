# Unified media playback

One `MediaFocus` and one viewport runtime own playback inside each browser tab. On iOS, `AppEnvironment.mediaPlayback` supplies the session focus policy to the native players and feed coordinator. Calls and decorative avatar animations remain separate. No account preference, storage, or backend schema changes are involved.

## Behavior

- Videos start muted in a fresh session. The session sound preference survives provider changes; an autoplay rejection may temporarily mute an individual player without changing that preference.
- A video qualifies when at least 75% of its height, capped by the usable viewport height, is visible. Selection waits 300 ms; a challenger must be 120 px closer to center to replace a still-eligible owner.
- Manual pause suppresses that instance until it leaves and returns. Audio pause retains audio priority. End, dismissal, and failure release priority and reevaluate the viewport without scrolling.
- Explicit video selection pauses audio without discarding its position. Fullscreen/PiP ownership survives scrolling. Ordinary videos pause in the background.
- Every rendered instance has its own identity. Teardown and delayed provider readiness cannot claim or release another instance’s ownership.

## Integration points

Web: `utils/mediaFocus.ts`, `utils/media/video-autoplay.ts`, `composables/useEmbeddedVideoManager.ts`, and `components/app/VoicePlaybackHost.vue`. Uploaded video, embedded video, lightboxes, voice messages, Spotify, radio, Space audio, watch parties, and interactive native previews use the same ownership policy. Scroll/resize/layout and ownership changes trigger selection. Multi-attachment grids remain tap-to-play.

Native: `MediaPlaybackFocus`, `VideoPlaybackCoordinator` and its viewport extension, `ChatAudioPlayer`, `InlineEmbedPlayer`, `SpotifyWebPlayer`, and `FocusedVideoViewController`. AVPlayer/AVKit remain responsible for native playback and system controls. The app supplies the ownership and selection policy.

Provider implementation references:

- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference): shared loader, readiness/state/error/blocked callbacks; no repeated play-message timers.
- [Rumble player implementation](https://rumble.com/j/pv/1134/ui.r2.js): isolated player document and validated message bridge; preserve supplied publisher IDs and the app’s existing default `7a20`. Apply volume before mute. Rumble internally debounces pause/play for 400 ms, so initialization uses one cancellable start after 500 ms. Provider controls, advertising, metadata, and delivery remain provider-owned.
- [Spotify IFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api): controller events replace iframe-focus heuristics. Collection track changes retain ownership.
- [Playback controls in the existing Figma library](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=792-152): inline playback, blocked/error recovery, audio priority, and separate provider handoff actions.

Ownership diagnostics contain media kind/provider and state only, without message contents or private media URLs.

## Validation record

Behavioral tests cover selection, audio priority/release, upload/embed transitions, delayed registration/readiness, shared sound, manual pause/reentry, instance teardown, route/screen scopes, background behavior, and pinned ownership. Rumble bridge tests execute its document script against a fake API and exercise message validation, command ordering, cancellation, and publisher preservation. PostMediaGrid’s previous source-order assertion is now a real mounting/update regression test.

Real provider checks have demonstrated YouTube muted playback and audio-release recovery without scrolling, and Rumble muted playback with advancing time in desktop Chrome. Focused tests also ran on a physical iPhone: **34 tests in 5 suites passed** before the user asked to stop further device testing. That device run predates the final Rumble startup and fullscreen lifecycle refinements.

Final build/test results and remaining manual coverage are recorded below when validation finishes.

## Remaining manual release checks

Use a feed with uploaded videos, YouTube, Rumble (including an advertisement), and Spotify. Repeat initial load and scrolling in both directions. Pause each provider through its own controls, scroll away/back, and switch sound across providers. Start/pause/end/dismiss audio, then explicitly select a video; verify audio stays resumable and does not resume by itself.

Exercise home, profiles, groups, discovery/search, bookmarks, check-ins, direct post pages and replies, quoted/duplicate posts, lightboxes, and watch-party local interruption/return. Repeat on desktop Safari, iPhone Safari, and native iOS. Verify PiP/fullscreen, background/foreground, headphones unplugged, audio-session interruptions, and unavailable/provider-blocked content. A simulator or fake provider is not evidence that these platform/provider cases passed.
