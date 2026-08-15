<template>
  <!-- hideTopBar page: no top padding here -->
  <AppPageContent bottom="standard">
    <ClientOnly>
      <Transition
        enter-active-class="transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
        enter-from-class="opacity-0 -translate-y-4"
        leave-active-class="transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none"
        leave-to-class="opacity-0 -translate-y-3"
      >
        <AppAnnouncementInlineCard
          v-if="inlineAnnouncement"
          :announcement="inlineAnnouncement"
          @dismiss="onAnnouncementDismiss"
          @cta="onAnnouncementCta"
        />
      </Transition>
    </ClientOnly>

    <!-- Daily check-in stays above the composer whether answered or not. Unanswered is a
         list row; answered collapses to one quiet line. Both are gated on `heroResolved`
         so we never flash the wrong variant before we know. SSR renders nothing; on mount
         the right one appears. See 45-hydration-safe-defaults.mdc. -->
    <AppFeedDailyCheckinHero
      v-if="heroResolved && !hasCheckedInToday"
      :state="checkinState"
      :prompt="checkinHeroPrompt"
      :my-checkin-body="lastCheckinBody"
      :can-answer="canAnswerCheckin"
      :on-answer="openCheckinComposer"
      :on-login-to-answer="goToLoginForCheckin"
    />

    <!-- Quiet line once today's question is answered. Streak / weekly-mission progress
         is meta on the row (`14d · 7/7`), not a second banner. -->
    <AppFeedDailyCheckinHero
      v-if="heroResolved && hasCheckedInToday"
      :state="checkinState"
      :prompt="checkinHeroPrompt"
      :my-checkin-body="lastCheckinBody"
      :can-answer="canAnswerCheckin"
      :on-answer="openCheckinComposer"
      :on-login-to-answer="goToLoginForCheckin"
      :weekly-mission-streak-days="displayCheckinStreak"
      compact
    />

    <!-- Verify-to-check-in CTA for authed-but-unverified users. The check-ins experience is
         verified-only, so rather than the live hero we drive verification. Client-only
         (ClientOnly) so SSR stays empty and there's no hydration mismatch. -->
    <ClientOnly>
      <AppFeedDailyCheckinHero
        v-if="isAuthed && !canAccessCheckins"
        :prompt="checkinHeroPrompt"
        verify-cta
      />
    </ClientOnly>

    <!-- Skeleton shown while the check-in state is still loading.
         ClientOnly keeps SSR output empty (same as the hero gates above).
         The min-h matches the full hero so the page doesn't jump on resolve. -->
    <ClientOnly>
      <div
        v-if="isAuthed && canAccessCheckins && !heroResolved"
        class="animate-pulse border-b moh-border"
        aria-hidden="true"
      >
        <div class="moh-gutter-x py-3 space-y-2">
          <div class="h-3 w-24 rounded-full bg-gray-200 dark:bg-zinc-700" />
          <div class="h-4 w-3/4 rounded-full bg-gray-200 dark:bg-zinc-700" />
        </div>
      </div>
    </ClientOnly>

    <!-- Composer sits under check-in and is always a regular post. Check-in only opens
         when the user hits Answer on the hero (or the checkin=1 deep-link). -->
    <div ref="homeComposerEl" class="min-h-0">
      <LazyAppPostComposer
        v-if="isAuthed && !showOnlyMeHomeComposerCard"
        key="home-regular"
        ref="homeComposerRef"
        :allowed-visibilities="['public', 'verifiedOnly', 'premiumOnly']"
        persist-key="home"
        :enable-avatar-status-editor="true"
        :register-unsaved-guard="false"
        collapse-until-focus
        @pending="onComposerPending"
      />
      <div v-else-if="isAuthed" class="px-3 pt-3 sm:px-4 sm:pt-4">
        <div class="rounded-2xl border moh-border moh-surface p-4 sm:p-5">
          <div class="flex items-start gap-3">
            <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg moh-btn-onlyme moh-btn-tone">
              <Icon name="tabler:eye-off" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold moh-text">Unverified mode: Only me drafts</div>
              <div class="mt-1 text-sm moh-text-muted">
                While unverified, your posts are private to you. Verify your account to post publicly.
              </div>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end">
            <Button
              label="Post to Only me"
              rounded
              class="moh-btn-onlyme moh-btn-tone"
              @click="openOnlyMeComposer"
            >
              <template #icon>
                <Icon name="tabler:plus" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Welcome card: shown to all new users who haven't dismissed it (localStorage) -->
    <ClientOnly>
      <AppFeedHomeWelcomeCard
        v-if="isAuthed"
        :show-checkin-cta="showCheckinPromptBar"
        :checkin-prompt="displayCheckinPromptText"
        @check-in="openCheckinComposer"
      />
    </ClientOnly>

    <ClientOnly>
      <div
        v-if="showGroupsOnboardingNudge"
        class="mx-3 mt-3 sm:mx-4 sm:mt-4 rounded-2xl border moh-border moh-surface p-4 sm:p-5"
      >
        <div class="flex items-start gap-3">
          <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border moh-border bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Icon name="tabler:users-group" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold moh-text">Join a community group</div>
            <p class="mt-1 text-sm moh-text-muted">
              Groups are smaller rooms for focused conversation — posts stay inside the group, not on the home feed.
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button as="NuxtLink" to="/groups/explore" label="Browse groups" rounded size="small" />
              <Button
                label="Dismiss"
                text
                rounded
                size="small"
                severity="secondary"
                @click="dismissGroupsNudge"
              />
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>

    <!-- Feed: header + content -->
    <div>
      <AppFeedHomeFeedHeader
        v-if="isAuthed"
        :scope="feedScope"
        :sort="feedSort"
        :filter="feedFilter"
        :viewer-is-verified="viewerIsVerified"
        :viewer-is-premium="viewerIsPremium"
        @update:scope="handleFeedScopeChange"
        @reselect="handleFeedScopeReselect"
        @update:sort="handleFeedSortChange"
        @update:filter="handleFeedFilterChange"
      />

      <div ref="homeFeedContentEl" class="h-0 overflow-hidden" aria-hidden="true" />

      <!-- Daily quote: demoted from the top stack so the check-in hero owns the daily slot.
           Kept mobile-only since the right rail still surfaces it on desktop. -->
      <AppFeedDailyQuoteCard />

      <div v-if="feedCtaKind === 'verify'" class="mx-3 mt-3 sm:mx-4 sm:mt-4">
        <AppAccessGateCard kind="verify" />
      </div>

      <div v-else-if="feedCtaKind === 'premium'" class="mx-3 mt-3 sm:mx-4 sm:mt-4">
        <AppAccessGateCard kind="premium" />
      </div>

      <template v-else>
        <AppInlineAlert v-if="error" class="mx-3 mt-3 sm:mx-4 sm:mt-4" severity="danger">
          <!-- Demonstrates wrapping AppUserErrorMessage for prominent alert style while reusing sanitization -->
          <AppUserErrorMessage :error="error" fallback="Failed to load feed." />
        </AppInlineAlert>

        <AppSubtleSectionLoader :loading="showMainLoader" min-height-class="min-h-[240px]">
            <AppFeedFollowingEmptyState
              v-if="initialFeedResolved && showFollowingEmptyState"
              :following-count="followingCount"
              :show-checkin-cta="showCheckinPromptBar"
              @find-people="navigateTo('/explore')"
              @post="homeComposerRef?.focus()"
              @check-in="openCheckinComposer"
            />
            <AppFeedAllEmptyState
              v-else-if="initialFeedResolved && (showAllEmptyState || showForYouEmptyState)"
              @explore="navigateTo('/explore')"
              @who-to-follow="navigateTo('/who-to-follow')"
            />

            <div ref="feedVirtualListContainerEl" class="relative mt-3">
              <div
                class="absolute inset-x-0 top-3 z-20 flex justify-center transition-opacity duration-150"
                :class="feedRefreshingOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!feedRefreshingOverlay"
              >
                <AppLogoLoader compact />
              </div>

              <!--
                Virtualized feed list — only ~OVERSCAN+visible rows are mounted at any time.
                Mirrors the chat list pattern (ChatMessageList.vue / @tanstack/vue-virtual).
                The outer div is height-stable (feedTotalSize px); each row is absolutely
                positioned at its measured offset so the scroller's scrollTop still works.
                TransitionGroup is dropped: off-screen rows have no DOM, so FLIP measurement
                is meaningless. New-post enter animation is handled via CSS on the row itself.
              -->
              <div
                :style="{
                  height: feedTotalSize + 'px',
                  width: '100%',
                  position: 'relative',
                  transition: 'opacity 150ms',
                  opacity: feedRefreshingOverlay ? 0.6 : 1,
                  pointerEvents: feedRefreshingOverlay ? 'none' : 'auto',
                }"
              >
                <div
                  v-for="virtualRow in feedVirtualItems"
                  :key="String(virtualRow.key)"
                  :ref="measureFeedRow"
                  :data-index="virtualRow.index"
                  :style="{
                    position: 'absolute',
                    top: '0px',
                    left: '0px',
                    width: '100%',
                    transform: `translateY(${virtualRow.start - feedListScrollMargin}px)`,
                  }"
                >
                  <template v-if="activeHomeFeedDisplayItems[virtualRow.index]">
                    <AppFeedFakeAdRow
                      v-if="activeHomeFeedDisplayItems[virtualRow.index]!.kind === 'ad'"
                    />
                    <AppFeedPostRow
                      v-else-if="activeHomeFeedDisplayItems[virtualRow.index]!.kind === 'post'"
                      :post="feedItemPost(activeHomeFeedDisplayItems[virtualRow.index])!"
                      collapse-ancestors
                      :activate-video-on-mount="feedItemPost(activeHomeFeedDisplayItems[virtualRow.index])?.id === newlyPostedVideoPostId"
                      :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(feedItemPost(activeHomeFeedDisplayItems[virtualRow.index])!)"
                      :show-collapsed-replies-footer="true"
                      :replies-sort="feedSort"
                      @deleted="removePost"
                      @edited="onFeedPostEdited"
                    />
                  </template>
                </div>
              </div>

              <p
                v-if="initialFeedResolved && !loading && activeHomeFeedDisplayItems.length === 0"
                class="px-4 py-12 text-center text-sm text-gray-400 dark:text-zinc-500"
              >
                No posts in this filter yet.
              </p>
            </div>

            <!-- Lazy-load sentinel + loader -->
            <div v-if="nextCursor" class="relative flex justify-center items-center px-4 py-6 min-h-12">
              <div
                ref="loadMoreSentinelEl"
                class="absolute bottom-0 left-0 right-0 h-px"
                aria-hidden="true"
              />
              <div
                class="transition-opacity duration-150"
                :class="loadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!loadingMore"
              >
                <AppLogoLoader compact />
              </div>
            </div>
        </AppSubtleSectionLoader>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { PostVisibility, CheckinAllowedVisibility } from '~/types/api'
import type { ComponentPublicInstance } from 'vue'
import type { PostsFeedDisplayItem } from '~/composables/usePostsFeed'
import type { FeedThreadDisplayPost } from '~/utils/merge-feed-threads-for-display'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { postBodyHasVideoEmbed } from '~/utils/link-utils'
import { pickCheckinPrompt } from '~/utils/checkin-prompts'
import { MOH_HOME_COMPOSER_IN_VIEW_KEY, MOH_OPEN_COMPOSER_KEY, MOH_FOCUS_HOME_COMPOSER_KEY } from '~/utils/injection-keys'
import { useMiddleScroller } from '~/composables/useMiddleScroller'

definePageMeta({
  layout: 'app',
  title: 'Home',
  hideTopBar: true,
  keepalive: true,
})

usePageSeo({
  title: 'Home',
  description: 'Your Men of Hunger feed — posts are shown in simple chronological order.',
  canonicalPath: '/home',
  noindex: true,
  ogType: 'website',
  // When sharing /home, always use the Men of Hunger logo (avoid scrapers picking a random in-feed image).
  image: '/images/logo-black-bg-small.png',
})

const homeComposerEl = ref<HTMLElement | null>(null)
const homeComposerRef = ref<{ focus: () => void } | null>(null)
const loadMoreSentinelEl = ref<HTMLElement | null>(null)
const homeComposerInViewRef = inject(MOH_HOME_COMPOSER_IN_VIEW_KEY)
const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)

provide(MOH_FOCUS_HOME_COMPOSER_KEY, () => {
  homeComposerRef.value?.focus()
})
const { isAuthed, user: authUser } = useAuth()
const {
  inlineAnnouncement,
  presentInline,
  onDismiss: onAnnouncementDismiss,
  onCta: onAnnouncementCta,
} = useAnnouncements()
watch(inlineAnnouncement, (item) => {
  if (item) presentInline()
}, { immediate: true })
const { groups: myGroups, load: loadMyGroups } = useMyGroups()
const groupsNudgeDismissed = useCookie('moh.groups-nudge.dismissed', {
  default: () => '',
  path: '/',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
})
const myGroupsCount = ref<number | null>(null)

watch(myGroups, (groups) => {
  if (isAuthed.value && !groupsNudgeDismissed.value) {
    myGroupsCount.value = groups.length
  }
})

async function refreshMyGroupsCount() {
  if (!isAuthed.value || groupsNudgeDismissed.value) {
    myGroupsCount.value = null
    return
  }
  try {
    await loadMyGroups()
    myGroupsCount.value = myGroups.value.length
  } catch {
    myGroupsCount.value = null
  }
}

const showGroupsOnboardingNudge = computed(() => {
  if (!isAuthed.value) return false
  if (groupsNudgeDismissed.value) return false
  if (myGroupsCount.value === null) return false
  return myGroupsCount.value === 0
})

function dismissGroupsNudge() {
  groupsNudgeDismissed.value = '1'
}

const { dayKey: etDayKey } = useEasternMidnightRollover()

const { state: checkinState, loading: checkinLoading, error: checkinError, refresh: refreshCheckin, create: createCheckin } = useDailyCheckin()

const checkinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
  const allowed = checkinState.value?.allowedVisibilities ?? []
  return Array.isArray(allowed) ? allowed : []
})

const fallbackCheckinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
  // Product rule: ONLY verified (and above) can check in. Answer always posts as
  // verifiedOnly (locked in the modal); premiumOnly is not offered for check-ins.
  if (!viewerIsVerified.value) return []
  return ['verifiedOnly']
})

const effectiveCheckinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
  const fromApi = checkinAllowedVisibilities.value.filter((v) => v === 'verifiedOnly')
  return fromApi.length ? fromApi : fallbackCheckinAllowedVisibilities.value
})

// True only when the user has completed today's check-in.
// This intentionally ignores "any post today" so the check-in prompt remains visible
// until a real check-in is submitted.
const hasCheckedInToday = computed(() => {
  if (!hydrated.value) return false
  return Boolean(checkinState.value?.hasCheckedInToday)
})

// Gates whether either daily-check-in row (unanswered or answered) is allowed to render.
// Goal: avoid a SSR/CSR flash where the unanswered row shows for a moment, then
// collapses into the quiet line once the auth + check-in state finally resolves.
//
// Truthy when:
//   - SSR has finished and the client has mounted (hydrated), AND
//   - Either the user is unauthenticated (full hero is the obvious answer), OR
//     the check-in state has loaded (success), OR
//     the initial fetch has settled (even on error) — so the page is never
//     left blank when the API is slow or fails. In the error case we show the
//     unanswered row in a degraded "no crew / no streak" mode; that's always better
//     than showing nothing.
//
// While false (still fetching), both <AppFeedDailyCheckinHero> instances are
// v-if'd off so SSR produces nothing and there is no wrong-variant flash.
const heroResolved = computed(() => {
  if (!hydrated.value) return false
  if (!isAuthed.value) return true
  // Stay hidden while the initial fetch is in-flight to avoid flashing the wrong variant.
  if (checkinLoading.value) return false
  return checkinState.value !== null
})

// Show the check-in prompt when user is eligible and hasn't posted today.
const showCheckinPromptBar = computed(() => {
  if (!isAuthed.value) return false
  if (feedCtaKind.value) return false
  if (!checkinState.value) return false
  if (checkinState.value.hasCheckedInToday) return false
  if (!effectiveCheckinAllowedVisibilities.value.length) return false
  return true
})


const checkinPromptText = computed(() => {
  const p = (checkinState.value?.prompt ?? '').trim()
  if (p) return p
  // API unavailable — derive today's question deterministically client-side
  // so the hero always shows the real prompt rather than generic placeholder text.
  return pickCheckinPrompt().prompt
})

// Use fallback text until after hydration so server and client match (checkinState can differ on SSR vs client).
const hydrated = ref(false)
const displayCheckinPromptText = computed(() => (hydrated.value ? checkinPromptText.value : 'Write a check-in…'))
const displayCheckinStreak = computed(() => (hydrated.value ? (checkinState.value?.checkinStreakDays ?? 0) : 0))


const middleScrollerRef = useMiddleScroller()

onMounted(() => {
  if (!import.meta.client) return
  hydrated.value = true

  // Deep-link from the check-in reminder push notification: open the composer immediately,
  // then strip the param so back-navigation / refresh doesn't re-open it.
  const route = useRoute()
  if (route.query.checkin === '1') {
    history.replaceState(null, '', location.pathname)
    // Wait a tick for openComposer injection and checkinState to settle.
    nextTick(() => { openCheckinComposer() })
  }

  // Initial scroll margin + ResizeObserver to update it when header height changes
  computeFeedScrollMargin()
  scrollMarginObserver = new ResizeObserver(computeFeedScrollMargin)
  if (homeComposerEl.value) scrollMarginObserver.observe(homeComposerEl.value)

  const el = homeComposerEl.value
  const root = middleScrollerRef.value
  if (!el || !root || !homeComposerInViewRef) return
  const obs = new IntersectionObserver(
    (entries) => {
      const e = entries[0]
      if (e) homeComposerInViewRef.value = e.isIntersecting
    },
    { root, rootMargin: '0px', threshold: 0 },
  )
  obs.observe(el)
  onBeforeUnmount(() => {
    obs.disconnect()
    homeComposerInViewRef.value = false
    scrollMarginObserver?.disconnect()
    scrollMarginObserver = null
  })
})

const newlyPostedVideoPostId = ref<string | null>(null)
let newlyPostedVideoPostTimer: ReturnType<typeof setTimeout> | null = null

const mediaOnlyFeed = computed(() => false)
const topLevelOnlyFeed = computed(() => false)
const {
  feedScope,
  feedFilter,
  feedSort,
  posts,
  collapsedSiblingReplyCountFor,
  nextCursor,
  loading,
  loadingMore,
  error,
  refresh,
  softRefreshNewer,
  notifyVisibleRowIds,
  loadMore,
  addReply,
  removePost,
  replacePost,
  prependOptimisticPost,
  replaceOptimistic,
  markOptimisticFailed,
  markOptimisticPosting,
  removeOptimistic,
  followingCount,
  showFollowingEmptyState,
  showForYouEmptyState,
  showAllEmptyState,
  viewerIsVerified,
  viewerIsPremium,
  feedCtaKind,
  displayItems,
  setFeedFilter,
  setFeedSort,
  resetFilters,
  onFeedScopeChange,
} = useHomeFeed({ mediaOnly: mediaOnlyFeed, topLevelOnly: topLevelOnlyFeed })

const homeFeedContentEl = ref<HTMLElement | null>(null)
const { scrollToTop: scrollFeedToTop } = useFeedScrollToTop(homeFeedContentEl)

function handleFeedScopeChange(scope: Parameters<typeof onFeedScopeChange>[0]) {
  onFeedScopeChange(scope)
  scrollFeedToTop()
}
// Re-tapping the already-active scope tab is the "give me something new" gesture — most useful
// on For You, where a plain refresh can otherwise return the exact same order once the viewer
// has seen everything. The API mints a fresh shuffle seed on every cursor-less request, so a
// hard refresh here is enough; no special-casing per scope needed.
function handleFeedScopeReselect() {
  scrollFeedToTop()
  void refresh()
}
function handleFeedSortChange(sort: Parameters<typeof setFeedSort>[0]) {
  setFeedSort(sort)
  scrollFeedToTop()
}
function handleFeedFilterChange(filter: Parameters<typeof setFeedFilter>[0]) {
  setFeedFilter(filter)
  scrollFeedToTop()
}
function handleFeedReset() {
  resetFilters()
  scrollFeedToTop()
}

const activeHomeFeedDisplayItems = computed(() => {
  return displayItems.value
})

/** Type-safe accessor: returns the post from a feed display item when kind === 'post'. */
function feedItemPost(item: PostsFeedDisplayItem | undefined): FeedThreadDisplayPost | undefined {
  return item?.kind === 'post' ? item.post : undefined
}

// ── Feed virtualizer ───────────────────────────────────────────────────────────
// Mirrors the chat list pattern (ChatMessageList.vue). Only ~OVERSCAN+visible
// rows are mounted at any time; off-screen rows are unmounted. The outer div
// is height-stable (feedTotalSize px); each row is absolutely positioned.
//
// scrollMargin = distance from the middle scroller's top to the feed list
// container's top. This accounts for the variable-height header stack above
// the feed (composer, check-in hero, welcome card, etc.). It's recomputed
// via ResizeObserver whenever the header resizes and via watchEffect whenever
// reactive state that drives header height changes.

const FEED_ESTIMATED_ROW_PX = 280
const FEED_OVERSCAN = 3

const feedVirtualListContainerEl = ref<HTMLElement | null>(null)
const feedListScrollMargin = ref(0)

function computeFeedScrollMargin() {
  const container = feedVirtualListContainerEl.value
  const scroller = middleScrollerRef.value
  if (!container || !scroller) {
    feedListScrollMargin.value = 0
    return
  }
  const scrollerRect = scroller.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  // Distance from scroll-container's content start to the list container top.
  const offset = containerRect.top - scrollerRect.top + scroller.scrollTop
  feedListScrollMargin.value = Math.max(0, Math.floor(offset))
}

let scrollMarginObserver: ResizeObserver | null = null

const initialFeedLoadStarted = ref(false)
const {
  initialFeedResolved,
  markInitialFeedResolved,
} = useHomeLoadState()

// Recompute when anything that changes header height changes reactively
// (check-in hero visible/collapsed, composer mounted/unmounted, etc.).
watchEffect(async () => {
  const _deps = [
    hasCheckedInToday.value,
    heroResolved.value,
    isAuthed.value,
    feedCtaKind.value,
    initialFeedResolved.value,
  ]
  if (!import.meta.client) return
  await nextTick()
  computeFeedScrollMargin()
})

const feedVirtualizer = useVirtualizer({
  get count() { return activeHomeFeedDisplayItems.value.length },
  getScrollElement: () => middleScrollerRef.value ?? null,
  estimateSize: () => FEED_ESTIMATED_ROW_PX,
  overscan: FEED_OVERSCAN,
  get scrollMargin() { return feedListScrollMargin.value },
  getItemKey: (index) => {
    const item = activeHomeFeedDisplayItems.value[index]
    if (!item) return index
    return item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)
  },
})

const feedVirtualItems = computed(() => feedVirtualizer.value.getVirtualItems())
const feedTotalSize = computed(() => feedVirtualizer.value.getTotalSize())

function measureFeedRow(el: Element | ComponentPublicInstance | null) {
  if (!el || !(el instanceof Element)) return
  feedVirtualizer.value.measureElement(el)
}

// Drive realtime subscriptions from visible virtualizer rows instead of DOM scan.
watch(feedVirtualItems, (items) => {
  const visibleIds = items
    .map(row => {
      const item = activeHomeFeedDisplayItems.value[row.index]
      return item?.kind === 'post' ? item.post.id : null
    })
    .filter((id): id is string => Boolean(id))
  notifyVisibleRowIds(visibleIds)
})

// Check-ins (feed, streaks, leaderboard) are verified-only; premium counts as verified.
const canAccessCheckins = computed(() => viewerIsVerified.value || viewerIsPremium.value)

watch(
  [isAuthed, canAccessCheckins, etDayKey],
  ([authed, canAccess]) => {
    // Unverified users never hit /checkins/today (it 403s); they see the
    // verify-CTA hero instead.
    if (!authed || !canAccess) {
      checkinState.value = null
      return
    }
    void refreshCheckin()
  },
  { immediate: true },
)

// When the ET day rolls over, refresh check-in state so the hero shows today's prompt.
watch(etDayKey, () => {
  if (isAuthed.value) void refreshCheckin()
})

/**
 * Last submitted check-in body for the hero's "you answered today" echo. Cleared on
 * day rollover so it doesn't bleed into tomorrow's prompt state.
 */
const lastCheckinBody = ref<string | null>(null)
watch(etDayKey, () => { lastCheckinBody.value = null })

async function createCheckinViaComposer(
  body: string,
  _visibility: PostVisibility,
  _media?: unknown[] | null,
  _poll?: unknown,
): Promise<{ id: string } | import('~/types/api').FeedPost | null> {
  const trimmed = body.trim()
  if (!trimmed) return null
  // Answer always posts verifiedOnly; modal locks that and leaves the session
  // composer preference untouched.
  const res = await createCheckin({ body: trimmed, visibility: 'verifiedOnly' })
  lastCheckinBody.value = trimmed
  posts.value = [res.post, ...posts.value.filter((p) => p.id !== res.post.id)]
  return res.post
}

/** Eligibility gate for the hero's primary action — verified users only (or premium). */
const canAnswerCheckin = computed(() => effectiveCheckinAllowedVisibilities.value.length > 0)

/** Hero prompt — falls back to a generic phrasing during SSR / initial load. */
const checkinHeroPrompt = computed(() => displayCheckinPromptText.value)

function goToLoginForCheckin() {
  void navigateTo('/login')
}

function openCheckinComposer() {
  if (!openComposer) return
  if (!effectiveCheckinAllowedVisibilities.value.length) return
  openComposer({
    checkinPrompt: checkinState.value?.prompt ?? null,
    allowedVisibilities: ['verifiedOnly'],
    disableMedia: true,
    createPost: createCheckinViaComposer,
  })
}

function onFeedPostEdited(payload: { id: string; post: import('~/types/api').FeedPost }) {
  replacePost(payload.post)
}

// Lazy-load more posts when sentinel nears bottom of scroll area
useLoadMoreObserver(loadMoreSentinelEl, middleScrollerRef, computed(() => Boolean(nextCursor.value)), loadMore)
onBeforeUnmount(() => {
  if (newlyPostedVideoPostTimer) {
    clearTimeout(newlyPostedVideoPostTimer)
    newlyPostedVideoPostTimer = null
  }
})

const showOnlyMeHomeComposerCard = computed(() => isAuthed.value && !viewerIsVerified.value)

watchEffect(() => {
  if (initialFeedResolved.value) return
  if (posts.value.length > 0 || Boolean(error.value)) {
    markInitialFeedResolved()
    return
  }
  if (loading.value) {
    initialFeedLoadStarted.value = true
    return
  }
  if (initialFeedLoadStarted.value && !loading.value) {
    // First request completed with an empty feed (no error).
    markInitialFeedResolved()
  }
})

watch(
  [isAuthed, initialFeedResolved, groupsNudgeDismissed],
  ([authed, feedResolved, dismissed]) => {
    if (!authed) {
      myGroupsCount.value = null
      return
    }
    if (feedResolved && !dismissed && myGroupsCount.value === null) {
      void refreshMyGroupsCount()
    }
  },
  { immediate: true },
)

const showMainLoader = computed(() => !initialFeedResolved.value && !error.value && posts.value.length === 0)
const feedRefreshingOverlay = computed(() => loading.value && initialFeedResolved.value && displayItems.value.length > 0)

function openOnlyMeComposer() {
  openComposer?.('onlyMe')
}

const replyModal = useReplyModal()
const { addPostsCallback, removePostsCallback } = usePresence()
const { prependToHomeFeed } = useHomeFeedPrepend()

const feedNewPostCb = {
  onFeedNewPost: (payload: import('~/types/api').WsFeedNewPostPayload) => {
    const post = payload?.post
    if (!post?.id) return
    // Group posts never appear on the home feed; the Groups badge is the signal.
    if (post.communityGroupId) return
    prependToHomeFeed(post)
  },
}

let unregisterReplyPending: null | (() => void) = null
onActivated(() => {
  if (!import.meta.client) return
  if (posts.value.length > 0) {
    // Posts are already in memory (keepalive). Soft-refresh only fetches posts newer than the
    // current head and prepends them, preserving the scroll position via anchor adjustment.
    // We delay by 300ms so this runs after the scroll-restoration plugin's 200ms re-apply,
    // preventing the two position adjustments from conflicting.
    // `onPrepend` adjusts scrollTop by N * estimated row height to keep the current view stable
    // (the virtualizer uses absolute positioning, so a prepend shifts all row offsets down).
    setTimeout(() => void softRefreshNewer({
      onPrepend: (addedCount) => {
        const scroller = middleScrollerRef.value
        if (scroller && addedCount > 0) {
          scroller.scrollTop += addedCount * FEED_ESTIMATED_ROW_PX
        }
      },
    }), 300)
  } else {
    // No posts yet (e.g. first activation, auth change) — do a full refresh.
    void refresh()
  }
  // Real-time: prepend new posts from followed users to the home feed.
  addPostsCallback(feedNewPostCb)
  // Optimistic replies: when the reply modal forwards a pending submit, slot
  // the optimistic row into the parent's position via `addReply` and let
  // pendingPosts handle the network call + retry/discard surface.
  const pendingCb = (payload: import('~/composables/useReplyModal').ReplyPendingPayload) => {
    addReply(payload.parentPost.id, payload.optimisticPost, payload.parentPost)
    pendingPosts.submit({
      localId: payload.localId,
      optimisticPost: payload.optimisticPost,
      perform: payload.perform,
      callbacks: {
        insert: () => {},
        replace: (lid, real) => replaceOptimistic(lid, real),
        markFailed: (lid, msg) => markOptimisticFailed(lid, msg),
        markPosting: (lid) => markOptimisticPosting(lid),
        remove: (lid) => removeOptimistic(lid),
      },
    })
  }
  unregisterReplyPending = replyModal.registerOnReplyPending(pendingCb)
})
onDeactivated(() => {
  removePostsCallback(feedNewPostCb)
  unregisterReplyPending?.()
  unregisterReplyPending = null
})

const pendingPosts = usePendingPostsManager()

function flashNewlyPostedVideo(post: import('~/types/api').FeedPost) {
  if (!postBodyHasVideoEmbed(post.body ?? '', Boolean(post.media?.length))) return
  newlyPostedVideoPostId.value = post.id
  if (!import.meta.client) return
  if (newlyPostedVideoPostTimer) clearTimeout(newlyPostedVideoPostTimer)
  newlyPostedVideoPostTimer = setTimeout(() => {
    newlyPostedVideoPostId.value = null
    newlyPostedVideoPostTimer = null
  }, 800)
}

function onComposerPending(payload: {
  localId: string
  optimisticPost: import('~/types/api').FeedPost
  perform: () => Promise<import('~/types/api').FeedPost | { id: string } | null | undefined>
}) {
  pendingPosts.submit({
    localId: payload.localId,
    optimisticPost: payload.optimisticPost,
    perform: payload.perform,
    callbacks: {
      insert: (p) => prependOptimisticPost(p),
      replace: (lid, real) => {
        replaceOptimistic(lid, real)
        flashNewlyPostedVideo(real)
      },
      markFailed: (lid, msg) => markOptimisticFailed(lid, msg),
      markPosting: (lid) => markOptimisticPosting(lid),
      remove: (lid) => removeOptimistic(lid),
    },
  })
}

// onFeedScopeChange is provided by useHomeFeed — remembers the selected scope and refreshes feed

</script>

<style scoped>
.media-grid-enter-active,
.media-grid-leave-active {
  transition: opacity 0.2s ease;
}

.media-grid-enter-from,
.media-grid-leave-to {
  opacity: 0;
}

.media-grid-move {
  transition: transform 0.25s ease;
}
</style>
