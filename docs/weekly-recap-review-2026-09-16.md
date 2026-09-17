# Your week: activity and reach

Design: [web recap](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=160-6),
[iOS recap](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=160-90),
[entry rows](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=155-21).

## Meaning of the numbers

- **Posts published** counts the owner's eligible top-level posts created during the last
  seven UTC calendar days, including today. Older posts with activity remain in the recap
  as “Active again,” so the recap post total can exceed posts published.
- **Participants** is the union of people who replied, boosted, reposted or quoted during
  the activity window. A person counts once across all recap posts and interaction types.
  The owner, bots, banned users and blocked actors do not add participants. Deleted or
  unreadable replies/reposts are excluded. Coin donors are not exposed as participants.
- **New** means no earlier reply, repost/quote or still-recorded boost on the owner's posts.
  Historical soft-deleted replies remain evidence that someone participated before.
- **Impressions** is the sum of each recap post's existing `totalViewCount`. These are lifetime
  counters, not a reconstruction of impressions earned in the last seven days. No migration
  or additional daily tracking is necessary.
- **People reached** deduplicates known viewers across those same posts. Linked guest browsers
  collapse into the signed-in user's identity. Unlinked guest browsers are estimates, not
  proof of distinct humans. Only the aggregate count leaves the API; viewer identities do not.
- A post's individual activity panel uses the same semantics with its existing 30-day activity
  window and lifetime reach for that post.

The activity chart includes boosts alongside replies and reposts. Coins retain their separate
marker and never inflate the stacked conversation counts. Both clients refresh when view totals
change or a boost/repost interaction arrives, coalescing updates through their existing refresh queue.

## Compatibility and validation

The contract adds `reach` and daily `boosts`. iOS accepts older responses with no reach and treats
missing boost counts as zero. Unrecognized reach scopes are not mislabeled as lifetime totals.
Web retains the same runtime fallbacks. Generated API/web contracts have been synchronized.

- API: six focused insight tests pass; changed-file lint, TypeScript, generated contracts,
  build, module graph and admin coverage pass.
- Web: 178 test files / 1,323 tests pass, followed by all 11 focused recap/media tests after
  the final realtime change. Changed-file lint passes. Actual components reviewed at phone
  and tablet widths using synthetic data in a temporary isolated preview.
- Figma: web and native layouts inspected, including light and dark themes.
- iOS: simulator build and all 10 focused tests pass (three suites, zero failures/skips, confirmed
  in the Xcode result bundle). Changed-file SwiftFormat and strict SwiftLint pass.
- Web: final type checking and production build pass. The final build used the repo
  local `SENTRY_UPLOAD=false` option; no source upload was needed for local verification.

Device acceptance: open Your week, verify posts/participants/reach against its listed posts,
then have another account reply, boost and repost. Confirm participant deduplication, chart
refresh, full-list expansion and share text. Check sheet scrolling at large Dynamic Type.

Live calls may coexist with ordinary media. Starting another voice message, video, radio or
Space source replaces current app media. Recording still reserves microphone capture and
cannot start during a call. Physical-device call routing and background controls need a manual pass.

## Compact participant entry refinement

Updated the existing [weekly entry masters](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=155-21)
before implementation. Home context: [dark phone](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=711-877),
[light phone](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=711-1049),
[narrow phone](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=711-1495).

The entry is now a 62pt minimum, two-line row: analytics icon and Last 7 days title,
+N participants at the trailing edge, and a secondary line of posts/reach/impressions.
Larger text/narrow widths wrap. The entire row remains the button. The + also appears
in the weekly detail; explanatory and accessibility copy makes clear that participants
are other people and exclude the viewer. It is not a growth/delta statistic. Post-level
activity counts and the API calculations are unchanged.

Changed web files pass ESLint; all 7 focused conversation tests pass. Actual components
were inspected in an isolated synthetic preview at 320/390/768 widths in light/dark,
including the real detail dialog. Swift changes pass strict lint/format and simulator build.
