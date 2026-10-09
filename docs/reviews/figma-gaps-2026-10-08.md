# Figma gaps closed — 2026-10-08 (Web)

Figma was updated first and remains the source of truth; newer Oct 8 designs win.

## Figma frames updated
- Page 04: `1220:1787`, `1322:17492`, `1322:19566`
- Page 23: `1322:19569`, `1322:19576`, `1322:19583`, `1322:19590`, `1322:19597`
- Page 18: `1322:45357`
- Page 24: `1139:169`, `1322:45371`

## What shipped
- Scheduled crosspost destinations; external-link 'Open site' dialog; YouTube playback-unavailable state.
- Channel inline reply; membership unavailable, activation pending, and premium recovery states.
- Landing articles, notification scripture preview, admin media-deletion confirm/changed states.

## Validation
See the validation matrix in `docs/engineering-policy.md`. Lint, typecheck, tests, build, hydration, and validate-api-types passed.


## October 9 Home and mobile navigation follow-up

Approved in [Men of Hunger — UI Library](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=385-11386):

- [Composer master](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=304-1220): editor inner horizontal padding is zero; draft and audience share the content edge (x74 mobile, x76 desktop) with the existing 14px mobile / 16px desktop gutter preserved. Nested editor components must retain the composer overrides.
- [Web mobile navigation](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=1420-2305): Home, Search, Groups, Notifications, Chat, More. Board remains reachable in More with its unread activity.
- [Personal closed schedule](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=193-1168): show “Check-ins open at 5pm ET” above the Home composer. Page accounts omit this area. Answering remains restricted to 5pm–midnight Eastern; a failed prompt fetch offers Retry.
- Updated Home examples: [711:877](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=711-877), [711:1049](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=711-1049), [711:1188](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=711-1188), [711:1356](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=711-1356), [711:1495](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=711-1495).
