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
    const layout = readFromRepo('layouts/app.vue')
    expect(layout).toMatch(/<ClientOnly>[\s\S]*<AppAdSlot\s+placement="rail"\s*\/>/)
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
    const layout = readFromRepo('layouts/app.vue')
    expect(layout).toMatch(/useWhoToFollow\(\{[\s\S]*enabled:\s*computed\(\(\)\s*=>\s*hydrated\.value\s*&&\s*!isRightRailForcedHidden\.value\)/)
  })

  it('gates mobile bottom-sheet mounting with hydrated media query helper', () => {
    const tabBar = readFromRepo('components/app/TabBar.vue')
    expect(tabBar).toMatch(/v-if="isMobileHydrated"/)
    expect(tabBar).toMatch(/const isMobileHydrated = useHydratedMediaQuery\('\(max-width: 767px\)'\)/)
  })

  it('avoids inline Date rendering in landing template', () => {
    const landing = readFromRepo('pages/index.vue')
    expect(landing).not.toMatch(/new Date\(\)\.getFullYear\(\)/)
    expect(landing).toMatch(/currentYear = new Date\(\)\.getUTCFullYear\(\)/)
  })

  it('uses stable non-index keys for notification media previews', () => {
    const row = readFromRepo('components/app/NotificationRow.vue')
    const group = readFromRepo('components/app/NotificationGroupRow.vue')
    expect(row).toMatch(/:key="notificationMediaPreviewKey\(m, idx\)"/)
    expect(group).toMatch(/:key="groupMediaPreviewKey\(m, idx\)"/)
  })

  it('gates the daily check-in hero on `heroResolved` so SSR never renders the wrong variant', () => {
    const home = readFromRepo('pages/home.vue')
    // Full and compact hero are both gated on heroResolved + the auth-derived hasCheckedInToday.
    // Without this gate we'd flash the full hero on first paint, then collapse it into the
    // compact one as soon as /checkins/today resolves on the client.
    expect(home).toMatch(/<AppFeedDailyCheckinHero\s+v-if="heroResolved && !hasCheckedInToday"/)
    expect(home).toMatch(/<AppFeedDailyCheckinHero\s+v-if="heroResolved && hasCheckedInToday"[\s\S]*?compact/)
    // heroResolved itself must require both `hydrated` AND a known checkin state (or unauth viewer).
    expect(home).toMatch(/const heroResolved = computed\(\(\) => {[\s\S]*?if \(!hydrated\.value\) return false[\s\S]*?if \(!isAuthed\.value\) return true[\s\S]*?return checkinState\.value !== null/)
  })

  // ---- Chat performance guardrails (Phase 2 of the freeze fix) -------------
  //
  // Together these assertions encode the invariants that keep the chat page
  // from freezing under realistic loads. Removing any of them without a
  // replacement is a regression — the fix is to update the relevant rule, not
  // the test.

  it('virtualizes the chat message list (no full DOM tree per message)', () => {
    const list = readFromRepo('components/app/chat/ChatMessageList.vue')
    expect(list).toMatch(/from '@tanstack\/vue-virtual'/)
    expect(list).toMatch(/useVirtualizer\(/)
    // The virtualizer needs a scroll container handle; the parent passes the
    // messagesScroller down explicitly.
    expect(list).toMatch(/scrollerEl/)
    // We rely on dynamic measurement, not hard-coded row heights.
    expect(list).toMatch(/measureElement/)
  })

  it('does not wrap the virtualized message list in TransitionGroup', () => {
    // A `TransitionGroup` around virtualized rows tracks every row for
    // enter/leave/move animations and defeats the whole point of windowing.
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
    // keeps the reactive footprint to the wrapper only.
    const chat = readFromRepo('pages/chat.vue')
    expect(chat).toMatch(/const conversations = shallowRef</)
    expect(chat).toMatch(/const messages = shallowRef</)
    expect(chat).toMatch(/triggerRef\(conversations\)/)
    expect(chat).toMatch(/triggerRef\(messages\)/)
  })

  it('viewport-gates the rich body side effects (link metadata, mentions, embeds)', () => {
    const body = readFromRepo('components/app/chat/ChatMessageRichBody.vue')
    // useElementVisibility + an `everVisible` latch are both required so a
    // 500-message thread doesn't fan out 500 metadata requests on first paint.
    expect(body).toMatch(/useElementVisibility/)
    expect(body).toMatch(/everVisible/)
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

  it('does NOT inject an x-marv-mode header from the post composer (Marv always uses auto mode for replies)', () => {
    // Post-reply mode selection was removed: Marv always auto-routes for thread replies.
    // The composer must not set x-marv-mode so the server handles routing exclusively.
    const composer = readFromRepo('components/app/PostComposer.vue')
    // No assignment of the header — only a comment mentioning it is acceptable.
    expect(composer).not.toMatch(/\['x-marv-mode'\]\s*=/)
    expect(composer).not.toMatch(/showMarvModePill/)
  })
})

