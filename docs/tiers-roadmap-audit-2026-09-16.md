# Tiers and roadmap audit — September 16, 2026

The current web, iOS, and API implementation is the source for this audit. “Implemented”
means a feature has a connected implementation; it does not certify its production
configuration, provider approval, App Store approval, or every device scenario.
No accounts, subscriptions, or production data were changed during this review.

## Published content changes

- Updated `config/tiers.data.json` and `config/roadmap.data.json`, which supply the pages and their metadata.
- Kept the four membership levels and current advertised monthly web prices. The live Stripe/App Store catalogs were not queried; App Store pricing is shown at purchase.
- Made verification a prerequisite for purchasing either paid tier.
- Added calls, verified Fitness/Apple Health, Premium sleep/HRV, video avatars, scheduled posts, and Marv's credit allowance and consent requirements.
- Corrected private groups: creation is already a Premium feature, not a future Premium+ exclusive.
- Marked unfinished membership benefits **Planned**, without implying an imminent launch.
- Updated native chat, article reading, and check-in day feeds to implemented. Kept article writing, coins, Crews, Spaces/radio, and leaderboards as web handoffs.
- Added a current-status section without deleting the original milestone anchors or unfinished backlog themes. Original dates are explicitly historical targets.
- Corrected claims about external identity verification, account deletion and Apple billing, media preapproval, chat privacy, draft recovery, and ranking neutrality.

## Important evidence

Paths below are relative to the three sibling repositories.

| Finding | Implementation evidence |
| --- | --- |
| Verification is currently reviewed by administrators | API `src/modules/verification/verification.service.ts` (`approveAdmin`, `verifiedStatus: 'manual'`). |
| Verification is required before a paid purchase and for paid entitlement | API `src/modules/billing/billing.service.ts`, `src/modules/billing/entitlement.service.ts`. |
| Basic Fitness is available to verified personal accounts; sleep/HRV require Premium | API `src/modules/fitness/fitness.controller.ts`, `src/modules/auth/identity-verified.guard.ts`, `src/modules/fitness/fitness.service.ts` (`toSummaryDto`). Web `components/settings/sections/SettingsFitnessSection.vue`; iOS `MenOfHunger/Domain/Fitness/Feature/Fitness/Screens/FitnessScreen.swift`. |
| Strava has implementation but limited availability | API `src/modules/fitness/fitness-strava.guard.ts` gates access on the account's `fitnessStrava` flag. |
| Premium creates open and private groups | API `src/modules/groups/groups.service.ts` (`createGroup`, join policies). |
| Marv access is permission-aware and metered | API `src/modules/marvin/services/marvin-catch-up.service.ts`, `marvin-personal.service.ts`, `marvin-credit.service.ts`. Marv credits are separate from member coins. |
| Native chat, calls, article reading, Fitness, and check-in day feeds exist | iOS `MenOfHunger/App/Screens/MainTabsScreen+Destinations.swift`; `MenOfHunger/Domain/Calls/Feature/Calls/Screens/CallScreen.swift`; corresponding domain screens. |
| Article authoring and remaining native destinations still use web | iOS `MenOfHunger/Domain/Articles/Feature/Articles/Screens/ArticlesScreen.swift`, `MenOfHunger/App/Navigation/AppRouter+DeepLinks.swift`; the leaderboard action in `MenOfHunger/Domain/Checkin/Feature/Checkin/Components/HomeCheckinCard.swift`. |
| Saved composer drafts need a retrieval surface | Web `plugins/unsaved-draft-guard.client.ts` writes `/drafts`. `composables/useDraftPosts.ts` has no consuming screen. API `src/modules/posts/posts-drafts.service.ts` stores `isDraft: true`, while `listOnlyMe` in `posts-feed-query.service.ts` explicitly filters `isDraft: false`. Only Me notes and saved composer drafts are different records. |
| Membership already affects ranking | API `src/modules/posts/posts-ranking.service.ts` weights boosts 3/2/1 for Premium/verified/other; `posts-ranking.config.ts` weights pins. `src/modules/follows/follows.service.ts` adds recommendation weights of 6 for Premium+ and 3 for Premium, alongside verification and other signals. These are weights, not guaranteed placement. |
| Account deletion exists; Apple billing is separate | API `src/modules/auth/account-deletion.service.ts` schedules erasure, tracks status, cancels Stripe billing, and clears personal content/fitness. Apple subscriptions require separate Apple management. |
| Session management is partial | API `src/modules/auth/auth.controller.ts` supports revoke-all. A device list and individual session revocation are still missing. |
| Safety follow-through is partial | Conversation muting/read indicators exist in messaging. Feed-level user muting, a receipt privacy preference, and member-facing report status/outcome delivery remain incomplete. See API `src/modules/messages/messages.controller.ts`, `src/modules/reports/reports.service.ts`, and web `components/settings/sections/SettingsPrivacySection.vue`. |
| Monitoring and email delivery have remaining work | Web and iOS contain Sentry integrations, including iOS `MenOfHunger/App/Infrastructure/Observability/SentryMonitoring.swift`; API has no corresponding integration. API `src/modules/newsletters/newsletters.service.ts` supports authoring/scheduling; bounce and suppression handling remain separate work. |

## Recommended work order

1. **Complete the release pass.** Manually validate iPhone and iPad onboarding, verification, purchase/restore/failure states, Health permission states, review-account access, and deletion using disposable test accounts. This is a release gate, not evidence that these implemented features are absent.
2. **Finish post draft recovery.** Surface saved drafts, resume and publish them, preserve media, and test navigation/app interruption. Then add continuous autosave and cross-device conflict handling. Saving without a way to retrieve work is a current usability gap.
3. **Set and enforce the ranking policy.** Decide whether membership should affect boosts, pins, and people recommendations. The updated pages disclose the present behavior; the implementation still conflicts with older “no paid reach” positioning elsewhere. Align those other surfaces once the policy is decided.
4. **Add account ownership controls.** Data export, a device/session list with individual revocation, verified phone-number changes, and a recovery path.
5. **Finish safety controls.** Feed user-muting, member-visible report outcomes/status, and a read-receipt preference across web/iOS/API.
6. **Make API failures actionable.** Add API error monitoring and verify alerts for auth, billing/webhooks, jobs, media, and integrations. Follow with email bounce/suppression handling.
7. **Deliver tangible Steward benefits.** Start with the forum, founder updates/calls, and an actual support workflow before expanding technical limits. These are currently labeled Planned.
8. **Finish remaining native workflows by usage.** Article writing and leaderboards first if daily writing/check-ins drive use; then coins, Crews, and Spaces with radio/watch parties. Native chat and article reading no longer belong on the missing list.
9. **Validate and expand Strava access.** Test provider consent, reconnect/disconnect, sync retries, and duplicate handling before lifting the limited rollout.
10. **Build community depth after release gaps.** Structured Dialogues and facilitated cohorts/workshops remain unfinished Premium promises. Start with one complete, usable workflow.

Keep quarterly/annual/gift plans, coin cosmetics, general event tools, developer webhooks,
advanced topics, dictionary lookup, achievement badges, and games in the later backlog.
They remain visible; this audit does not assign delivery dates or approve proposed prices.

## Design and implementation handoff

The canonical Figma page is [Membership & roadmap](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=647-6).

- [Tiers desktop](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=647-7)
  and [mobile](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=650-20384):
  concise membership cards followed by expandable full benefits, planned benefits and limits.
- [Roadmap desktop](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=647-8)
  and [mobile](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=650-20544):
  current work first, explicit status labels, expandable history and categorized backlog.
- Light variants are on the same page. Shared library type, color variables and buttons are reused.
- [Stable post counts](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=655-3944)
  reserve space at zero, one and larger values; compact k/m/b/t labels avoid widening the gutter.
- [Inline Marv permission](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=628-243)
  replaces the separate modal on both clients. Permission remains an explicit, saved choice.

No factual benefits or historical milestone anchors were removed by the redesign. Available,
planned and platform-limited capabilities remain separate. The initial raw Figma captures were
removed after the component-based screens were inspected.

## Verification

Changed Vue/TypeScript files pass ESLint and full web type checking. Sixteen focused tests cover
inline permission behavior, request coalescing, roadmap presentation and compact engagement labels.
An earlier focused run also passed 44 post-cache and three reactivity tests. Production Nuxt build
completed; existing Tailwind/source-map warnings and network-restricted Sentry upload warnings remain.

Fresh production-preview loads of Tiers and Roadmap were inspected, with no console warnings or
errors in the in-app browser. Chrome phone-width checks confirmed 350px cards fit a 390px viewport.
Both pages were visually checked in light and dark themes. Premium benefits expand correctly and
`/roadmap#march-2026` still opens and scrolls to the historical milestone. Chrome also reported
storage errors originating from an installed extension; the isolated in-app preview did not.

No Playwright test suite was added or run. Browser checks used the temporary production preview;
user-owned development servers were not restarted. The earlier stale development SSR observation
was not used as evidence for the final production build.

See the API repository's `docs/marv-reply-debugging.md` for the production delivery investigation,
regression coverage, diagnostic commands and the post-deployment smoke test. The generic API
observability roadmap item remains unfinished: these Marv diagnostics do not replace API-wide
error monitoring or alerts.
