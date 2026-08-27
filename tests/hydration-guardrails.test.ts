import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  // In the Nuxt Vitest environment, `import.meta.url` can be a virtual URL.
  // Use CWD (repo root in CI/local) to keep this stable.
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('hydration guardrails (structural)', () => {
  it('does not inject AdSense loader into initial HTML head', () => {
    const nuxtConfig = readFromRepo('nuxt.config.ts')
    expect(nuxtConfig).not.toMatch(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/)
  })

  it('keeps rail ad mount point behind a client-only boundary', () => {
    const rail = readFromRepo('components/app/layout/RightRail.vue')
    expect(rail).toMatch(/<ClientOnly>[\s\S]*<AppAdSlot\s+placement="rail"\s*\/>/)
  })

  it('keeps AppAdSlot free of ClientOnly/Suspense and guards provider DOM behind onMounted', () => {
    const adSlot = readFromRepo('components/app/AdSlot.vue')
    expect(adSlot).not.toMatch(/<ClientOnly>/)
    expect(adSlot).toMatch(/v-if="mounted\s*&&\s*shouldShowAd\s*&&\s*adsenseEnabled"/)
    expect(adSlot).toMatch(/onMounted\(\(\)\s*=>\s*{\s*[\s\S]*mounted\.value\s*=\s*true/)
  })

  it('does not use module-scope topic options caches as render inputs', () => {
    const useTopicOptions = readFromRepo('composables/useTopicOptions.ts')
    expect(useTopicOptions).not.toMatch(/TOPIC_OPTIONS_CACHE/)
    expect(useTopicOptions).toMatch(/useState<.*>\('moh\.topicOptions\.v1'/)
  })

  it('gates mention tier inference until after mount (prevents SSR/client first-render drift)', () => {
    const useMention = readFromRepo('composables/useMentionAutocomplete.ts')
    expect(useMention).toMatch(/const mounted = ref\(false\)/)
    expect(useMention).toMatch(/onMounted\(\(\)\s*=>\s*{\s*[\s\S]*mounted\.value\s*=\s*true/)
    expect(useMention).toMatch(/if\s*\(!mounted\.value\)\s*return/)
  })

  it('uses deterministic ids for avatar SVG masks', () => {
    const avatarCircle = readFromRepo('components/app/AvatarCircle.vue')
    expect(avatarCircle).toMatch(/idleClockMaskId = `idle-clock-mask-\$\{useId\(\)\}`/)
    expect(avatarCircle).not.toMatch(/idle-clock-mask-\$\{Math\.random\(/)
  })

  it('gates right-rail media-query structure with hydrated media query helper', () => {
    const layout = readFromRepo('layouts/app.vue')
    expect(layout).toMatch(/const isRightRailBreakpointUp = useHydratedMediaQuery\('\(min-width: 962px\)'\)/)
  })

  it('gates right-rail who-to-follow fetch until after hydration', () => {
    const rail = readFromRepo('components/app/layout/RightRail.vue')
    expect(rail).toMatch(/useWhoToFollow\(\{[\s\S]*enabled:\s*computed\(\(\)\s*=>\s*hydrated\.value\s*&&\s*secondaryLoadsEnabled\.value\s*&&\s*!props\.forcedHidden\)/)
  })

  it('defers home right-rail secondary loads until the first feed resolves', () => {
    const home = readFromRepo('pages/home.vue')
    const rail = readFromRepo('components/app/layout/RightRail.vue')
    expect(home).toMatch(/useHomeLoadState\(\)/)
    expect(home).toMatch(/markInitialFeedResolved\(\)/)
    expect(rail).toMatch(/route\.path !== '\/home' \|\| initialFeedResolved\.value/)
    expect(rail).toMatch(/<AppRightRailContent v-if="hydrated && secondaryLoadsEnabled">/)
    expect(rail).toMatch(/immediate:\s*false/)
  })

  it('keeps padding above who-to-follow when the rail quote is hidden', () => {
    const rail = readFromRepo('components/app/layout/RightRail.vue')
    expect(rail).toMatch(/v-if="!isPageAccount"/)
    expect(rail).toMatch(/<AppOperatorSwitchRailCard v-if="isPageAccount"/)
  })

  it('replaces the invite rail card with a one-click operator switch for page accounts', () => {
    const rail = readFromRepo('components/app/layout/RightRail.vue')
    const invite = readFromRepo('components/app/ReferralRailCard.vue')
    const switchCard = readFromRepo('components/app/OperatorSwitchRailCard.vue')
    const gate = readFromRepo('composables/usePersonAccountGate.ts')
    expect(rail).toMatch(/<AppOperatorSwitchRailCard v-if="isPageAccount" class="mt-4 mb-4"/)
    expect(rail).toMatch(/<AppReferralRailCard v-if="!isPageAccount"/)
    expect(invite).toMatch(/!isPageAccount\.value/)
    expect(switchCard).toMatch(/label="Switch back"/)
    expect(switchCard).toMatch(/useAppConfirm/)
    expect(switchCard).toMatch(/confirmLabel: 'Switch back'/)
    expect(switchCard).toMatch(/w-full !rounded-full/)
    expect(switchCard).toMatch(/switchToOperator/)
    expect(switchCard).toMatch(/AppUserAvatar/)
    expect(switchCard).toMatch(/refreshAccounts/)
    expect(switchCard).toMatch(/>Primary</)
    expect(switchCard).toMatch(/text-\[var\(--moh-brass\)\]/)
    expect(gate).toMatch(/accountKind === 'person' && !account.isCurrent/)
  })

  it('shares the my-groups request across home surfaces', () => {
    const cache = readFromRepo('composables/useMyGroups.ts')
    expect(cache).toMatch(/inFlightByApp/)
    expect(cache).toMatch(/MY_GROUPS_FRESH_MS/)
    for (const path of [
      'pages/home.vue',
      'components/app/PostComposer.vue',
      'components/app/groups/AppGroupsRailCard.vue',
      'pages/groups/index.vue',
    ]) {
      const src = readFromRepo(path)
      expect(src).toMatch(/useMyGroups\(\)/)
      expect(src).not.toMatch(/apiFetchData<[^>]+>\('\/groups\/me'\)/)
    }
    const railCard = readFromRepo('components/app/groups/AppGroupsRailCard.vue')
    expect(railCard).toMatch(/mohUnauthorized: 'ignore'/)
    expect(railCard).toMatch(/isAuthed\.value \? loadMyGroups/)
  })

  it('unsubscribes push before logout and ignores a leftover 401', () => {
    const push = readFromRepo('composables/usePushNotifications.ts')
    expect(push).toMatch(/\/notifications\/push-unsubscribe/)
    expect(push).toMatch(/mohUnauthorized: 'ignore'/)

    const auth = readFromRepo('composables/useAuth.ts')
    const unsubscribeAt = auth.indexOf('await onLogout()')
    const logoutAt = auth.indexOf("'/auth/logout'")
    const revokeAt = auth.indexOf("'/auth/sessions/revoke-all'")
    expect(unsubscribeAt).toBeGreaterThan(-1)
    expect(logoutAt).toBeGreaterThan(-1)
    expect(revokeAt).toBeGreaterThan(-1)
    expect(unsubscribeAt).toBeLessThan(logoutAt)
    expect(unsubscribeAt).toBeLessThan(revokeAt)
  })

  it('gates mobile bottom-sheet mounting with hydrated media query helper', () => {
    const tabBar = readFromRepo('components/app/TabBar.vue')
    expect(tabBar).toMatch(/v-if="isMobileHydrated"/)
    expect(tabBar).toMatch(/const isMobileHydrated = useHydratedMediaQuery\('\(max-width: 767px\)'\)/)
  })

  it('keeps scripture overlay primitives behind hydrated breakpoint checks', () => {
    const scripture = readFromRepo('components/app/ScriptureVersePopover.vue')
    expect(scripture).toMatch(/<ClientOnly>/)
    expect(scripture).toMatch(/<Popover v-if="isDesktopHydrated"/)
    expect(scripture).toMatch(/<AppBottomSheet[\s\S]*v-if="isMobileHydrated"/)
    expect(scripture).toMatch(/const isMobileHydrated = useHydratedMediaQuery\('\(max-width: 767px\)'\)/)
    expect(scripture).toMatch(/const isDesktopHydrated = useHydratedMediaQuery\('\(min-width: 768px\)'\)/)
    expect(scripture).not.toMatch(/window\.(?:innerWidth|matchMedia)/)
  })

  it('avoids inline Date rendering in landing template', () => {
    const landing = readFromRepo('pages/index.vue')
    expect(landing).not.toMatch(/new Date\(\)\.getFullYear\(\)/)
    expect(landing).toMatch(/currentYear = new Date\(\)\.getUTCFullYear\(\)/)
  })

  it('keeps optimized landing theme images stable through first hydration', () => {
    const landing = readFromRepo('pages/index.vue')
    expect(landing).toMatch(/<img[\s\S]*:src="landingHeroSrc"/)
    expect(landing).toMatch(/\/images\/landing-light\.webp/)
    expect(landing).toMatch(/\/images\/landing-dark\.webp/)
    expect(landing).not.toMatch(/from '~\/assets\/images\/landing-/)
    expect(landing).not.toMatch(/<NuxtImg/)
    expect(landing).toMatch(/const landingThemeReady = ref\(false\)/)
    expect(landing).toMatch(/landingThemeReady\.value && colorMode\.value === 'light'/)
    expect(landing).toMatch(/onMounted\(\(\) => {\s*landingThemeReady\.value = true/)
  })

  it('uses stable non-index keys for notification media previews', () => {
    const row = readFromRepo('components/app/NotificationRow.vue')
    const group = readFromRepo('components/app/NotificationGroupRow.vue')
    expect(row).toMatch(/:key="notificationMediaPreviewKey\(m, idx\)"/)
    expect(group).toMatch(/:key="groupMediaPreviewKey\(m, idx\)"/)
    expect(group).toMatch(/group\.kind === 'nudge' && group\.count > 1/)
    expect(group).toMatch(/×\{\{ group\.count \}\}/)
  })

  it('gates the daily check-in hero on `heroResolved` so SSR never renders the wrong variant', () => {
    const home = readFromRepo('pages/home.vue')
    // Unanswered row and answered compact line are both gated on heroResolved +
    // the auth-derived hasCheckedInToday. Without this gate we'd flash the
    // unanswered row on first paint, then collapse it once /checkins/today resolves.
    expect(home).toMatch(/<AppFeedDailyCheckinHero\s+v-if="heroResolved && !hasCheckedInToday"/)
    expect(home).toMatch(/<AppFeedDailyCheckinHero\s+v-if="heroResolved && hasCheckedInToday"[\s\S]*?compact/)
    expect(home).not.toMatch(/AppFeedWeeklyMissionCard/)
    expect(home).toMatch(/collapse-until-focus/)
    const hero = readFromRepo('components/app/feed/DailyCheckinHero.vue')
    expect(hero).toMatch(/moh-checkin-row/)
    expect(hero).toMatch(/moh-checkin-row-accent/)
    expect(hero).toMatch(/to="\/leaderboard"/)
    expect(hero).not.toMatch(/rounded-2xl/)
    expect(hero).not.toMatch(/linear-gradient/)
    const leaderboard = readFromRepo('pages/leaderboard.vue')
    expect(leaderboard).toMatch(/Share this week's mission/)
    expect(leaderboard).toMatch(/weeklyMissionShareText/)
    const composerSource = readFromRepo('components/app/PostComposer.vue')
    expect(composerSource).toMatch(/collapseUntilFocus/)
    expect(composerSource).toMatch(/v-show="!showCollapsedComposer"/)
    // heroResolved itself must require both `hydrated` AND a known checkin state (or unauth viewer).
    expect(home).toMatch(/const heroResolved = computed\(\(\) => {[\s\S]*?if \(!hydrated\.value\) return false[\s\S]*?if \(!isAuthed\.value\) return true[\s\S]*?return checkinState\.value !== null/)
    // Check-in (answered or not) stays above the composer.
    const answeredHero = home.indexOf('v-if="heroResolved && hasCheckedInToday"')
    const homeComposer = home.indexOf('ref="homeComposerEl"')
    expect(answeredHero).toBeGreaterThan(-1)
    expect(homeComposer).toBeGreaterThan(answeredHero)
  })

  it('JoinBanner gates visibility on a hydrated ref so SSR never renders the logged-out banner', () => {
    const banner = readFromRepo('components/app/JoinBanner.vue')
    // Must use a local `hydrated` ref set in onMounted so SSR emits nothing
    // and the client shows the banner only after confirming !isAuthed.
    expect(banner).toMatch(/hydrated\s*=\s*ref\(false\)/)
    expect(banner).toMatch(/onMounted[\s\S]*?hydrated\.value\s*=\s*true/)
    expect(banner).toMatch(/hydrated\.value && !isAuthed\.value/)
  })

  it('wraps the check-in hero loading skeleton in ClientOnly so SSR emits nothing', () => {
    const home = readFromRepo('pages/home.vue')
    // The skeleton must be inside <ClientOnly> to prevent SSR from rendering it
    // (which would cause a hydration mismatch when the client replaces it with the real hero).
    // It is also gated on `canAccessCheckins` so unverified users (who never fetch
    // /checkins/today) see the verify-CTA hero instead of a skeleton that never resolves.
    expect(home).toMatch(/<ClientOnly>[\s\S]*?v-if="isAuthed && canAccessCheckins && !heroResolved"[\s\S]*?<\/ClientOnly>/)
  })

  it('shows the verify-to-check-in CTA only client-side for unverified users', () => {
    const home = readFromRepo('pages/home.vue')
    // Check-ins are verified-only; unverified authed users get a verify CTA instead of
    // the live hero. It must be inside <ClientOnly> so SSR emits nothing (no hydration
    // mismatch on the auth-derived `canAccessCheckins`).
    expect(home).toMatch(/<ClientOnly>[\s\S]*?<AppFeedDailyCheckinHero[\s\S]*?v-if="isAuthed && !isPageAccount && !canAccessCheckins"[\s\S]*?verify-cta[\s\S]*?<\/ClientOnly>/)
    const explore = readFromRepo('pages/explore.vue')
    expect(explore).toMatch(/<ClientOnly>[\s\S]*?v-if="isAuthed && !isPageAccount && !canAccessCheckins"[\s\S]*?verify-cta[\s\S]*?<\/ClientOnly>/)
  })

  it('hides the home daily quote for operated pages without hydrating it', () => {
    const home = readFromRepo('pages/home.vue')
    expect(home).toMatch(/<ClientOnly>[\s\S]*?<AppFeedDailyQuoteCard v-if="!isPageAccount"[\s\S]*?<\/ClientOnly>/)
  })

  it('hides home get-started and join-group cards for operated pages', () => {
    const home = readFromRepo('pages/home.vue')
    expect(home).toMatch(/<AppFeedHomeWelcomeCard[\s\S]*?v-if="isAuthed && !isPageAccount"/)
    expect(home).toContain('if (!isAuthed.value || isPageAccount.value) return false')
    expect(home).toMatch(/class="mx-3 my-3 sm:mx-4 sm:my-4 rounded-2xl border moh-border moh-surface/)
  })

  it('hides Check-ins notification chips for operated pages', () => {
    const notifications = readFromRepo('pages/notifications.vue')
    expect(notifications).toMatch(/isPageAccount\.value \? chips\.filter\(\(chip\) => chip\.kind !== 'checkin_post'\)/)
    expect(notifications).toMatch(/isPageAccount\.value && q === 'checkin_post'/)
  })

  // ---- Chat performance guardrails ------------------------------------------
  //
  // These assertions encode the invariants that keep the chat page from
  // freezing or mis-scrolling under load.
  //
  // History:
  //  Phase 1 – freeze fix used @tanstack/vue-virtual.
  //  Phase 2 – scroll fix replaced the virtualizer with a plain v-for list.
  //  Phase 3 – CSS containment (content-visibility with "auto") was tried for
  //             browser-native windowing but REJECTED: the 72px intrinsic-size
  //             estimate wildly underestimates media rows (actual 280-320px),
  //             causing scrollHeight to be wrong on first open and landing the
  //             user in the middle of a media-heavy chat. Do NOT re-add it
  //             without solving the estimate problem first.
  //  Phase 4 – the per-conversation scroll-offset cache was REMOVED. It had to
  //             be written while the thread was still growing (images decode
  //             after first paint), so it recorded a mid-load offset, replayed
  //             it on the next open, and pinned atBottom=false — which then
  //             blocked the ResizeObserver from ever correcting. The wrong
  //             position fed itself. Chat always opens on the newest message.

  it('chat always opens at the bottom (no per-conversation scroll-offset cache)', () => {
    const scroll = readFromRepo('composables/chat/useChatScroll.ts')
    // A cache of scrollTop keyed by conversation is self-poisoning — see above.
    expect(scroll).not.toMatch(/scrollTopByChatKey/)
    expect(scroll).not.toMatch(/getCachedScrollTopForChatKey/)
    expect(scroll).not.toMatch(/cacheCurrentChatScrollPosition/)
  })

  it('disables browser scroll anchoring on the chat scroller', () => {
    // Chrome's overflow-anchor repositions scrollTop (with sub-pixel values)
    // when content above the viewport grows, and fires a scroll event doing so.
    // That made our own bottom-pin measure as "user scrolled away", clearing
    // atBottom and stranding the user mid-history. useChatScroll's
    // ResizeObserver owns bottom anchoring, so the browser's must stay off.
    const pane = readFromRepo('components/app/chat/ChatThreadPane.vue')
    expect(pane).toMatch(/overflow-anchor:\s*none/)
  })

  it('keeps the chat scroller vertical-only', () => {
    // overflow-y-auto alone computes overflow-x from `visible` to `auto`, so
    // any overflowing bubble silently enables horizontal scrolling.
    const pane = readFromRepo('components/app/chat/ChatThreadPane.vue')
    expect(pane).toMatch(/overflow-x-hidden/)
  })

  it('does NOT use content-visibility on chat rows (causes scrollHeight estimation bug with media)', () => {
    const list = readFromRepo('components/app/chat/ChatMessageList.vue')
    // content-visibility: auto is banned — see comment above.
    expect(list).not.toMatch(/content-visibility:\s*auto/)
    expect(list).not.toMatch(/contain-intrinsic-size/)
    // Virtualizer is still gone.
    expect(list).not.toMatch(/from '@tanstack\/vue-virtual'/)
    expect(list).not.toMatch(/useVirtualizer\(/)
  })

  it('does not wrap the chat message list in TransitionGroup', () => {
    // TransitionGroup runs FLIP on every element it tracks. With 200+ chat rows
    // that means recording and animating all of them whenever a single message
    // lands — noticeable jank on mid-range devices. Individual rows animate via
    // the `moh-chat-item-enter` CSS class applied by `markMessageAnimated`;
    // that costs only one style recalc for the new row.
    const list = readFromRepo('components/app/chat/ChatMessageList.vue')
    expect(list).not.toMatch(/<TransitionGroup/)
  })

  it('uses a static CSS bubble-shape heuristic (no ResizeObserver per bubble)', () => {
    const shape = readFromRepo('composables/chat/useChatBubbleShape.ts')
    // The composable explains its history in a JSDoc comment, so we look for
    // actual *usage* rather than any mention.
    expect(shape).not.toMatch(/new ResizeObserver/)
    expect(shape).not.toMatch(/\.getBoundingClientRect\(\)/)
    // The heuristic is a pure exported function (testable without a Vue
    // setup context) — see `tests/chat/pick-bubble-shape.test.ts`.
    expect(shape).toMatch(/export function pickBubbleShape\(message: Message\)/)
    expect(shape).toMatch(/export function bubbleShapeClass\(message: Message\)/)
  })

  it('does not eagerly subscribe presence interest for the entire conversation list', () => {
    const chat = readFromRepo('pages/chat.vue')
    // The old eager-subscribe machinery is gone:
    expect(chat).not.toMatch(/const presenceInterestIds = computed/)
    expect(chat).not.toMatch(/syncPresenceInterests\(/)
    // The new viewport-driven subscription delegates to
    // `useRefcountedInterest`, which owns the refcount + per-frame
    // coalesced flush + teardown (and is unit-tested in isolation).
    expect(chat).toMatch(/useRefcountedInterest\(/)
    expect(chat).toMatch(/onConversationRowPresenceVisible/)
  })

  it('creates the conversation-row IntersectionObserver eagerly, not in onMounted', () => {
    // Vue invokes `:ref` function callbacks during the patch phase, BEFORE
    // `onMounted` fires. If the observer were created in onMounted the very
    // first batch of rows would mount, fire their refs against a null
    // observer, and never get observed (stable function refs don't re-fire
    // on subsequent renders) — silently breaking presence subscriptions.
    // We avoid that by extracting the IO bookkeeping into
    // `useViewportIdsObserver`, which constructs the observer in `setup`.
    const list = readFromRepo('components/app/chat/ChatConversationList.vue')
    expect(list).toMatch(/useViewportIdsObserver\(/)
    expect(list).not.toMatch(/new IntersectionObserver/)
    const tracker = readFromRepo('composables/chat/useViewportIdsObserver.ts')
    expect(tracker).toMatch(/new IntersectionObserver/)
    // The observer must be created at module-setup time (synchronously),
    // not lazily inside onMounted.
    expect(tracker).not.toMatch(/onMounted\([^)]*new IntersectionObserver/)
  })

  it('keys chat conversation rows by stable conversation id and animates reorder (TransitionGroup)', () => {
    const list = readFromRepo('components/app/chat/ChatConversationList.vue')
    expect(list).toMatch(/<TransitionGroup/)
    expect(list).toMatch(/name="moh-chat-row"/)
    // Stable key — list order changes constantly; `:key="c.id"` is what lets
    // Vue reuse row instances and TransitionGroup FLIP-move them.
    expect(list).toMatch(/:key="c\.id"/)
    expect(list).not.toMatch(/:key="index"/)
    expect(list).not.toMatch(/:key="i\b/)
  })

  it('pins isBot rows to the top of /online (Marv always-online)', () => {
    // The API marks the synthetic Marv row with `isBot: true` only when MARV_ENABLED
    // is on. Whenever Marv is present in the list, the frontend's sort comparator
    // must put him before any real user, even if a real user just connected at the
    // same instant. If this guardrail breaks, Marv silently sinks down the list.
    const online = readFromRepo('pages/online.vue')
    // The sort must check `isBot` BEFORE the lastConnectAt comparison.
    expect(online).toMatch(/if \(a\.isBot && !b\.isBot\) return -1/)
    expect(online).toMatch(/if \(!a\.isBot && b\.isBot\) return 1/)
  })

  it('renders the AI badge via AppVerifiedBadge when user.isBot is true (no Bot pill in UserRow)', () => {
    // The "Bot" pill was replaced with an AI badge rendered inside AppVerifiedBadge / AppAiBadge.
    // UserRow passes isBot through AppUserIdentityLine → AppVerifiedBadge → AppAiBadge.
    const userRow = readFromRepo('components/app/UserRow.vue')
    // UserRow must NOT have a standalone bot pill — the badge lives in the identity line.
    expect(userRow).not.toMatch(/tabler:robot/)
    expect(userRow).not.toMatch(/>Bot</)
    // The identity line component receives the user object which carries isBot.
    expect(userRow).toMatch(/AppUserIdentityLine/)

    // AppVerifiedBadge must have an isBot prop and delegate to AppAiBadge.
    const verifiedBadge = readFromRepo('components/app/VerifiedBadge.vue')
    expect(verifiedBadge).toMatch(/isBot/)
    expect(verifiedBadge).toMatch(/AppAiBadge/)

    // AiBadge itself must exist.
    const aiBadge = readFromRepo('components/app/AiBadge.vue')
    expect(aiBadge).toMatch(/tabler:sparkles/)
  })

  it('uses shallowRef for the chat conversations + messages stores', () => {
    // Deep reactivity over message bodies, sender chains, and reactions was
    // walking 100s of objects on every patch. shallowRef + manual triggerRef
    // keeps the reactive footprint to the wrapper only. The stores now live
    // in the chat composables (extracted from pages/chat.vue).
    const conversationsStore = readFromRepo('composables/chat/useChatConversations.ts')
    expect(conversationsStore).toMatch(/const conversations = shallowRef</)
    expect(conversationsStore).toMatch(/triggerRef\(conversations\)/)

    const threadStore = readFromRepo('composables/chat/useChatThread.ts')
    expect(threadStore).toMatch(/const messages = shallowRef</)
    expect(threadStore).toMatch(/triggerRef\(messages\)/)
  })

  it('viewport-gates the rich body side effects (link metadata, mentions, embeds)', () => {
    const body = readFromRepo('components/app/chat/ChatMessageRichBody.vue')
    // useElementVisibility + an `everVisible` latch are both required so a
    // 500-message thread doesn't fan out 500 metadata requests on first paint.
    expect(body).toMatch(/useElementVisibility/)
    expect(body).toMatch(/everVisible/)
  })

  it('keeps X post previews metadata-driven and backed by a real external anchor', () => {
    const card = readFromRepo('components/app/XPostPreviewCard.vue')
    const postPreview = readFromRepo('components/app/post/PostRowLinkPreview.vue')
    const chatPreview = readFromRepo('components/app/chat/ChatMessageRichBody.vue')
    expect(card).toMatch(/<a[\s\S]*?:href="href"/)
    expect(card).not.toMatch(/import\.meta\.client|window\.|document\./)
    expect(postPreview).toMatch(/linkMeta\.value\?\.socialPost/)
    expect(chatPreview).toMatch(/linkMeta\.value\?\.socialPost/)
  })

  // ---- Marv (AI helper) guardrails ----------------------------------------
  //
  // These tests encode invariants that prevent SSR/client drift on the chat
  // page's pinned Marv row and the in-chat marv strip. The marv-related state
  // lives in `useState` keys inside `useMarv()` so SSR matches the client's
  // first patch (instead of `null` -> populated drift).

  it('keys marv state via useState so SSR matches the first client paint', () => {
    const marv = readFromRepo('composables/useMarv.ts')
    // All state keys are namespaced under `marv:*` and built with useState so
    // hydration sees the same initial values on both sides.
    expect(marv).toMatch(/useState<MarvinMeDto \| null>\(`\$\{stateKey\}:me`/)
    expect(marv).toMatch(/useState<boolean>\(`\$\{stateKey\}:hasFetched`/)
    expect(marv).toMatch(/useState<boolean>\(`\$\{stateKey\}:subscribed`/)
  })

  it('only registers the marv websocket subscription on the client', () => {
    // Calling `addMarvCallback` during SSR would race against socket.io's
    // browser-only init and produce a hydration warning. The subscription is
    // gated behind `import.meta.client`.
    const marv = readFromRepo('composables/useMarv.ts')
    expect(marv).toMatch(/function startRealtime\(\)\s*{[\s\S]*?if \(!import\.meta\.client\) return/)
  })

  it('renders the pinned marv row above the conversation list via a slot, only on the primary tab', () => {
    const list = readFromRepo('components/app/chat/ChatConversationList.vue')
    // The list owns the slot but doesn't know about marv specifically — chat.vue
    // owns the marv state. Critical for SSR: when the slot has no content the
    // wrapper isn't rendered (`v-if="$slots.pinned"`), which avoids an empty
    // `<div>` mismatch when the page route renders this component without the
    // slot during SSR (e.g. an unauthenticated SSR pass).
    expect(list).toMatch(/<div v-if="\$slots\.pinned && activeTab === 'primary'"/)
  })

  it('uses real <NuxtLink> anchors for the pinned marv row (right-click / cmd-click)', () => {
    // Per `40-internal-links.mdc`, every internal navigation must produce a
    // real <a> in the DOM. Both the premium row and the non-premium CTA must
    // render NuxtLink, not a button + navigateTo.
    const row = readFromRepo('components/app/chat/ChatMarvPinnedRow.vue')
    expect(row).toMatch(/<NuxtLink[\s\S]*?:to="conversationPath"/)
    expect(row).toMatch(/<NuxtLink[\s\S]*?to="\/tiers"/)
  })

  it('fetches announcements after mount and renders them through AppModal', () => {
    const host = readFromRepo('components/app/AnnouncementHost.vue')
    const modal = readFromRepo('components/app/AnnouncementModal.vue')
    const overlays = readFromRepo('components/app/layout/GlobalOverlays.vue')
    expect(overlays).toMatch(/<AppAnnouncementHost\s*\/>/)
    expect(host).toMatch(/onMounted\(\(\)\s*=>\s*{/)
    expect(host).toMatch(/fetchPending\(\)/)
    expect(host).not.toMatch(/onActivated/)
    expect(modal).toMatch(/<AppModal/)
    expect(modal).toMatch(/max-w-2xl/)
    expect(modal).toMatch(/hide-header/)
    expect(readFromRepo('pages/home.vue')).toMatch(/AppAnnouncementInlineCard/)
    expect(readFromRepo('composables/useAnnouncements.ts')).toMatch(/placement === 'inline'/)
    expect(modal).toMatch(/openFromEvent/)
    expect(modal).toMatch(/cursor-zoom-in/)
  })

  it('keeps the Marv "Catch me up" modal behind ClientOnly + Teleport (SSR emits nothing)', () => {
    // The modal reads auth/premium/credit state that only resolves on the client.
    // Rendering it during SSR would produce a hydration mismatch when the client
    // replaces the (empty) server output. ClientOnly + Teleport-to-body keeps it
    // off the SSR tree entirely.
    const modal = readFromRepo('components/app/MarvCatchUpModal.vue')
    expect(modal).toMatch(/<ClientOnly>[\s\S]*<Teleport to="body">/)
    // The open flag lives in useState (shared with the row trigger) so there's a
    // single source of truth — not a local ref that drifts between instances.
    const composable = readFromRepo('composables/useMarvCatchUp.ts')
    expect(composable).toMatch(/useState<boolean>\('marv-catchup:open'/)
    // Opening the modal must not auto-spend credits. `show()` auto-PEEKs the cache
    // (cacheOnly: true — free, no model call), never auto-generates. Generation only
    // happens via `run()`, triggered explicitly by the user.
    expect(composable).toMatch(/function show\(/)
    expect(composable).toMatch(/async function run\(opts\?: \{ refresh\?: boolean \}\)/)
    expect(composable).toMatch(/async function peek\(\)/)
    expect(composable).toMatch(/cacheOnly: true/)
    // show() must call peek(), not run(), on open.
    expect(composable).toMatch(/void peek\(\)/)
    const showBody = composable.slice(composable.indexOf('function show('), composable.indexOf('function hide('))
    expect(showBody).not.toMatch(/\brun\(/)
  })

  it('gates the PostRow Catch-me-up trigger on auth (every real post row, not pending/deleted)', () => {
    const row = readFromRepo('components/app/PostRow.vue')
    // Signed-in viewers see it on every real row — catch-up summarizes the post itself
    // plus broader context, so it's useful even without a surrounding thread.
    expect(row).toMatch(/isAuthed\.value && !isPendingRow\.value && !isDeletedPost\.value/)
  })

  it('defers the PostRow catch-up icon localStorage read until after mount', () => {
    // The high-contrast icon state comes from localStorage, which does not exist during SSR.
    // Reading it in `setup` (or via an `immediate: true` watcher) would render a different
    // icon class than the server emitted — a hydration mismatch on every public feed page.
    // The initial read must happen in onMounted; the watcher exists only to re-read when a
    // row is recycled for a different post while scrolling.
    const row = readFromRepo('components/app/PostRow.vue')
    expect(row).toMatch(/const catchUpPersistedReady = ref\(false\)/)
    expect(row).toMatch(/onMounted\(\(\) => \{\s*catchUpPersistedReady\.value = isPostCaughtUp\(/)
    // Match the watcher's full shape: it must close right after the callback, with no options
    // object. An `{ immediate: true }` would fire during setup and reintroduce the mismatch.
    expect(row).toMatch(
      /watch\(\s*\(\) => postView\.value\.id,\s*\(id\) => \{\s*catchUpPersistedReady\.value = isPostCaughtUp\(id\)\s*\},\s*\)/,
    )
  })

  it('expires the catch-up localStorage registry so the icon cannot outlive the server cache', () => {
    // The row icon promises "a summary is waiting". The server drops cached summaries on a
    // TTL, so a registry entry that never expires turns that promise into a lie: the user
    // taps a bright icon and lands on a paid regenerate prompt. Entries are timestamped and
    // the read is expiry-checked.
    const composable = readFromRepo('composables/useMarvCatchUp.ts')
    expect(composable).toMatch(/CAUGHT_UP_TTL_MS/)
    expect(composable).toMatch(/Date\.now\(\) - at < CAUGHT_UP_TTL_MS/)
    // Guard against regressing to the original un-timestamped string[] format.
    expect(composable).toMatch(/type CaughtUpRecord = Record<string, number>/)
  })

  it('gates the catch-me-up pill on isMounted so localStorage is never read during SSR', () => {
    // The pill reads/writes localStorage (lastSeenCount, dismissedCount). On the server that
    // call would throw. The v-if guard must include `isMounted` so the pill is invisible
    // during the SSR pass and first client paint, then appears after hydration.
    const page = readFromRepo('pages/p/[id].vue')
    expect(page).toMatch(/v-if="isMounted && showCatchMeUpPill/)
    expect(page).toMatch(/const isMounted = ref\(false\)/)
    expect(page).toMatch(/onMounted\(\(\)\s*=>\s*\{[\s\S]*?isMounted\.value\s*=\s*true/)
  })

  it('keeps Discover more behind ClientOnly + IntersectionObserver (lazy, not SSR)', () => {
    const page = readFromRepo('pages/p/[id].vue')
    expect(page).toMatch(/<ClientOnly>[\s\S]*Discover more[\s\S]*<\/ClientOnly>/)
    expect(page).toMatch(/usePostDiscoverMore/)
    expect(page).toMatch(/IntersectionObserver/)
  })

  it('keeps the modal panel at a fixed height (not content-sized) so it never resizes between states', () => {
    // A resizing modal feels janky. The panel must declare an explicit h-[34rem]
    // as well as the viewport-constrained max-h cap.
    const modal = readFromRepo('components/app/MarvCatchUpModal.vue')
    expect(modal).toMatch(/h-\[34rem\]/)
    expect(modal).toMatch(/max-h-\[85vh\]/)
  })

  it('does NOT inject an x-marv-mode header from the post composer (Marv always uses auto mode for replies)', () => {
    // Post-reply mode selection was removed: Marv always auto-routes for thread replies.
    // The composer must not set x-marv-mode so the server handles routing exclusively.
    const composer = readFromRepo('components/app/PostComposer.vue')
    // No assignment of the header — only a comment mentioning it is acceptable.
    expect(composer).not.toMatch(/\['x-marv-mode'\]\s*=/)
    expect(composer).not.toMatch(/showMarvModePill/)
  })

  it('renders flat reposts correctly in the notifications page (repost header + original post)', () => {
    const page = readFromRepo('pages/notifications.vue')
    // notificationIsFlatRepost guard must be present
    expect(page).toMatch(/notificationIsFlatRepost/)
    // The repost header component must be used for flat reposts
    expect(page).toMatch(/AppPostRepostHeader/)
    // notificationShowsPostRow must fall back for flat reposts without repostedPost
    expect(page).toMatch(/n\.post\.repostedPost/)
  })

  it('NotificationGroupRow avatar cluster is content-sized (no fixed-width rail that causes overflow)', () => {
    const row = readFromRepo('components/app/NotificationGroupRow.vue')
    // Must NOT have the old fixed w-[5.25rem] rail that was too narrow
    expect(row).not.toMatch(/w-\[5\.25rem\]/)
    // Must NOT have overflow-visible on the avatar container (avatars should stay inside their column)
    expect(row).not.toMatch(/overflow-visible/)
    // Must still have the avatar cap (two actors + optional overflow chip)
    expect(row).toMatch(/actors\.slice\(0,\s*2\)/)
  })

  it('useKeyboardHeight infers keyboard height from a baseline, not from window.innerHeight', () => {
    const composable = readFromRepo('composables/useKeyboardHeight.ts')
    // iOS reports innerHeight inconsistently (it tracks the layout viewport when the
    // document is scrollable but collapses onto the visual viewport when it is not), so
    // differencing it against vv.height silently returns 0 for a fixed-shell layout.
    // The keyboard-closed baseline has no such coupling.
    expect(composable).toMatch(/baselineHeight\s*-\s*(height|opts\.viewportHeight)/)
    expect(composable).toMatch(/KEYBOARD_OPEN_MIN_PX/)
    expect(composable).toMatch(/inferredKeyboardHeight/)
    expect(composable).not.toMatch(/window\.innerHeight\s*-\s*vv\.height/)
    // Subtracting offsetTop is also wrong: iOS panning makes it positive, which would
    // cancel out the height delta.
    expect(composable).not.toMatch(/-\s*vv\.offsetTop/)
    // Baseline must be re-learned on width change (rotation/resize), never on keyboard open.
    expect(composable).toMatch(/width\s*!==\s*baselineWidth/)
    // Desktop must not be able to trip the baseline path by resizing the window.
    expect(composable).toMatch(/hasCoarsePointer/)
  })

  it('pins the fixed app shell to the visual viewport while the keyboard is open', () => {
    const layout = readFromRepo('layouts/app.vue')
    const composable = readFromRepo('composables/useKeyboardHeight.ts')
    // The composable must expose visual-viewport geometry AND the VirtualKeyboard API height.
    expect(composable).toMatch(/viewportHeight/)
    expect(composable).toMatch(/viewportOffsetTop/)
    expect(composable).toMatch(/virtualKeyboardHeight/)
    // Shared pin helper used by shell + overlays (Android overlay + iOS pan).
    expect(composable).toMatch(/function keyboardPinnedFixedStyle/)
    expect(composable).toMatch(/export function useKeyboardPinnedFixedStyle/)
    expect(composable).toMatch(/virtualKeyboardHeight\s*>\s*0/)
    expect(composable).toMatch(/viewportHeight\s*-\s*virtualKeyboardHeight/)
    expect(composable).toMatch(/top:\s*`\$\{viewportOffsetTop\}px`/)
    expect(composable).toMatch(/height:\s*`\$\{viewportHeight\}px`/)
    // Layout consumes the shared pin (not a one-off shell-only copy).
    expect(layout).toMatch(/useKeyboardPinnedFixedStyle/)
    expect(layout).toMatch(/style:\s*shellStyle/)
    // Must stay SSR-stable: unmeasured (height 0) falls back to plain inset.
    expect(composable).toMatch(/inset:\s*'0'/)
    // A panned viewport must be corrected on its own, even if keyboard detection is empty.
    expect(composable).toMatch(/viewportOffsetTop\s*>\s*0/)
  })

  it('reply and composer overlays use the same keyboard pin as the app shell', () => {
    const reply = readFromRepo('components/app/ReplyModal.vue')
    const composer = readFromRepo('components/app/layout/ComposerModalOverlay.vue')
    for (const src of [reply, composer]) {
      expect(src).toMatch(/useKeyboardPinnedFixedStyle/)
      expect(src).toMatch(/overlayStyle/)
      // Must not use plain fixed inset-0 (that ignores the keyboard overlay path).
      expect(src).not.toMatch(/class="fixed inset-0 z-\[1000\]"/)
    }
  })

  it('scrolls mid-scroller inputs into view when the keyboard opens', () => {
    const layout = readFromRepo('layouts/app.vue')
    const helper = readFromRepo('composables/useEnsureFocusedInputVisible.ts')
    expect(layout).toMatch(/useEnsureFocusedInputVisible\(\s*middleScrollerEl\s*\)/)
    expect(helper).toMatch(/keyboardHeight/)
    expect(helper).toMatch(/scrollElementIntoScroller/)
    expect(helper).toMatch(/focusin/)
  })

  it('no surface pads itself by the full keyboard height (the pinned shell already does)', () => {
    // The shell is pinned to the visual viewport, so it ends at the top of the keyboard.
    // A surface that also pads by keyboardHeight double-counts and leaves a keyboard-sized
    // gap. Padding by a bare keyboardHeight interpolation is therefore always a bug.
    for (const file of ['components/app/chat/ChatComposerBar.vue', 'components/app/article/EditorPage.vue']) {
      expect(readFromRepo(file)).not.toMatch(/paddingBottom:\s*`\$\{keyboardHeight\.value/)
    }
  })

  it('keyboard hide is app-wide (isKeyboardOpen, not gated to specific routes)', () => {
    const layout = readFromRepo('layouts/app.vue')
    const composable = readFromRepo('composables/useKeyboardHeight.ts')
    // isKeyboardOpen comes from the shared pin helper and is only derived from keyboardHeight.
    expect(layout).toMatch(/isKeyboardOpen/)
    expect(composable).toMatch(/isKeyboardOpen\s*=\s*computed\(\(\)\s*=>\s*keyboardHeight\.value\s*>\s*0\)/)
    // The old route-gated expression must be gone.
    expect(layout).not.toMatch(/isArticleEditorPage/)
    expect(layout).not.toMatch(/hideTabBarForKeyboard/)
  })

  it('mobile bottom chrome clips only while collapsing for the keyboard', () => {
    const layout = readFromRepo('layouts/app.vue')
    // overflow-hidden while max-h-0 so the collapse doesn't leave stray scrollbars.
    // overflow-visible otherwise so radio-bar avatar glow is not clipped.
    expect(layout).toMatch(/isKeyboardOpen \? 'max-h-0 overflow-hidden' : 'max-h-36 overflow-visible'/)
  })

  it('keeps hover-zoom transform idle until hydration (media query is client-only)', () => {
    // useMediaQuery reads window on first client setup, so the hover-ready
    // transform (translate3d + will-change) must stay gated behind
    // useHydratedMediaQuery. Otherwise every public post with media mismatches.
    const zoom = readFromRepo('composables/useHoverPanZoom.ts')
    expect(zoom).toMatch(/useHydratedMediaQuery\('\(hover: hover\) and \(pointer: fine\)'\)/)
    expect(zoom).not.toMatch(/useMediaQuery\('\(hover: hover\)/)
  })

  it('does not light the viewed icon from local session state until after hydration', () => {
    // markEngaged() writes a module-level Set during client setup. Using that
    // Set for the person-icon class before app:mounted makes SSR (muted) and
    // the first client paint (moh-text) disagree on every permalink.
    const row = readFromRepo('components/app/PostRow.vue')
    expect(row).toMatch(/useState<boolean>\('moh-hydrated'/)
    expect(row).toMatch(/hydrated\.value && hasViewedLocally/)
    const permalink = readFromRepo('pages/p/[id].vue')
    expect(permalink).toMatch(/useState<boolean>\('moh-hydrated'/)
    expect(permalink).toMatch(/!isHydrated/)
    const watchBody = permalink.slice(permalink.indexOf('const { markEngaged }'), permalink.indexOf('function onDeleted'))
    expect(watchBody).toMatch(/markEngaged\(chainIds\)/)
    expect(watchBody).not.toMatch(/immediate:\s*true/)
  })

  it('shows a full-screen API-down overlay (not a thin banner) when apiUnreachable', () => {
    const banners = readFromRepo('components/app/layout/ConnectionBanners.vue')
    const layout = readFromRepo('layouts/app.vue')
    expect(layout).toMatch(/AppLayoutConnectionBanners/)
    // Overlay gates on the shared auth flag and covers the viewport.
    expect(banners).toMatch(/v-if="apiUnreachable && !apiJustReconnected"/)
    expect(banners).toMatch(/fixed inset-0 z-\[80\]/)
    expect(banners).toMatch(/Can't reach the server/)
    expect(banners).toMatch(/to="\/status"/)
    // Successful Retry must reload so stuck widget error states clear.
    expect(banners).toMatch(/reloadNuxtApp\(\{\s*force:\s*true\s*\}\)/)
    // Must not regress to the thin amber connectivity strip for API outages.
    expect(banners).not.toMatch(/Trouble connecting to the server/)
  })
})

