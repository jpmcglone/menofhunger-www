<template>
  <!-- hideTopBar page: no top padding here -->
  <AppPageContent bottom="standard">
    <!-- Daily check-in hero is the page's purpose statement. It renders full-bleed at the top
         until the user has answered (drives the "answer this" intent for the day). After they
         answer, the hero collapses to a compact strip placed under the composer so the home
         page can give the composer + feed back the prime real estate.

         Both variants are gated on `heroResolved` so we never flash the full hero before we
         know whether the user has already answered. SSR renders nothing for either; on mount,
         the right one appears in the right slot. See 45-hydration-safe-defaults.mdc. -->
    <AppFeedDailyCheckinHero
      v-if="heroResolved && !hasCheckedInToday"
      :state="checkinState"
      :prompt="checkinHeroPrompt"
      :my-checkin-body="lastCheckinBody"
      :can-answer="canAnswerCheckin"
      :on-answer="openCheckinComposer"
      :on-login-to-answer="goToLoginForCheckin"
    />

    <!-- Layout: Composer at top, feed below. Wrapper ref used to detect when composer is in view (hides mobile FAB). -->
    <div ref="homeComposerEl" class="min-h-0">
      <AppPostComposer
        v-if="isAuthed && !showOnlyMeHomeComposerCard"
        ref="homeComposerRef"
        :allowed-visibilities="['public', 'verifiedOnly', 'premiumOnly']"
        persist-key="home"
        enable-avatar-status-editor
        :register-unsaved-guard="false"
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

    <!-- Compact hero shown under the composer once today's question is answered. Same component
         + realtime hooks as the full hero, just collapsed. Hidden for logged-out viewers since
         they never have an answered state. Gated on `heroResolved` so SSR renders nothing
         here and we don't briefly show the full hero on top before this collapses in.

         When the viewer is verified and has a streak, we also pass `weekly-mission-streak-days`
         which folds the weekly-mission progress card INTO this card (one combined clickable
         surface → /leaderboard) instead of showing a second card below. The standalone
         AppFeedWeeklyMissionCard render below is gated to only fire when this fold-in doesn't. -->
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

    <!-- Weekly mission card: shown to verified users with an active or recent streak.
         When the compact daily-check-in hero is visible (viewer answered today), the mission
         row is folded into that card so the surface stays a single clickable card. We only
         render this standalone card when the compact hero isn't going to show (i.e. before
         today's check-in is in). -->
    <ClientOnly>
      <AppFeedWeeklyMissionCard
        v-if="isAuthed && viewerIsVerified && displayCheckinStreak > 0 && !hasCheckedInToday"
        :checkin-streak-days="displayCheckinStreak"
      />
    </ClientOnly>

    <!-- Feed: header + content -->
    <div>
      <AppFeedHomeFeedHeader
        v-if="isAuthed"
        :scope="feedScope"
        :sort="feedSort"
        :filter="feedFilter"
        :scope-tabs="scopeTabs"
        :viewer-is-verified="viewerIsVerified"
        :viewer-is-premium="viewerIsPremium"
        :show-reset="feedFilter !== 'all' || (feedScope !== 'forYou' && feedSort !== 'new')"
        @update:scope="onFeedScopeChange"
        @update:sort="setFeedSort"
        @update:filter="setFeedFilter"
        @reset="() => void resetFilters()"
      />

      <div v-if="isAuthed" ref="homeFeedTabBarEl" class="relative flex gap-0 border-b border-gray-200 dark:border-zinc-800">
        <button
          v-for="tab in homeFeedTabs"
          :key="tab.key"
          :ref="(el) => setHomeFeedTabButtonRef(tab.key, el as HTMLElement | null)"
          type="button"
          class="relative cursor-pointer px-5 py-3 text-sm font-semibold transition-colors"
          :class="activeHomeFeedTab === tab.key
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'"
          @click="setHomeFeedTab(tab.key)"
        >
          {{ tab.label }}
        </button>
        <span
          class="absolute bottom-0 h-[2px] rounded-full bg-[var(--p-primary-500,#b45309)]"
          :class="homeFeedUnderlineReady ? 'transition-[left,width] duration-250 ease-in-out' : ''"
          :style="{ left: `${homeFeedUnderlineLeft}px`, width: `${homeFeedUnderlineWidth}px` }"
          aria-hidden="true"
        />
      </div>

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
          {{ error }}
        </AppInlineAlert>

        <AppSubtleSectionLoader :loading="showMainLoader" min-height-class="min-h-[240px]">
            <AppFeedFollowingEmptyState
              v-if="initialFeedResolved && showFollowingEmptyState"
              :following-count="followingCount"
              :show-checkin-cta="showCheckinPromptBar"
              @find-people="navigateTo('/explore')"
              @check-in="openCheckinComposer"
            />
            <AppFeedAllEmptyState
              v-else-if="initialFeedResolved && (showAllEmptyState || showForYouEmptyState)"
              @explore="navigateTo('/explore')"
              @who-to-follow="navigateTo('/who-to-follow')"
            />

            <div class="relative mt-3">
              <div
                class="absolute inset-x-0 top-3 z-20 flex justify-center transition-opacity duration-150"
                :class="feedRefreshingOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!feedRefreshingOverlay"
              >
                <AppLogoLoader compact />
              </div>
              <TransitionGroup
                v-if="activeHomeFeedTab !== 'media'"
                name="feed-post"
                tag="div"
                class="transition-opacity duration-150"
                :class="feedRefreshingOverlay ? 'opacity-60 pointer-events-none' : 'opacity-100'"
              >
                <template v-for="item in activeHomeFeedDisplayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <AppFeedPostRow
                    v-else
                    :post="item.post"
                    :activate-video-on-mount="item.post.id === newlyPostedVideoPostId"
                    :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(item.post)"
                    :show-collapsed-replies-footer="activeHomeFeedTab !== 'posts'"
                    :replies-sort="feedSort"
                    @deleted="removePost"
                    @edited="onFeedPostEdited"
                  />
                </template>
              </TransitionGroup>
              <div v-else>
                <div
                  class="transition-opacity duration-150"
                  :class="feedRefreshingOverlay ? 'opacity-60 pointer-events-none' : 'opacity-100'"
                >
                  <TransitionGroup
                    name="media-grid"
                    tag="div"
                    class="grid gap-0.5 bg-gray-200 dark:bg-zinc-800"
                    style="grid-template-columns: repeat(auto-fill, minmax(min(120px, 100%), 1fr))"
                  >
                    <NuxtLink
                      v-for="item in homeMediaItems"
                      :key="item.id"
                      :to="`/p/${encodeURIComponent(item.postId)}`"
                      class="relative aspect-square overflow-hidden bg-gray-100 transition-opacity hover:opacity-90 dark:bg-zinc-900"
                    >
                      <img
                        :src="item.kind === 'video' ? (item.thumbnailUrl ?? item.url) : item.url"
                        :alt="item.alt || (item.kind === 'video' ? 'Video' : 'Photo')"
                        class="absolute inset-0 h-full w-full object-cover moh-img-outline"
                        loading="lazy"
                      />
                      <div v-if="item.kind === 'video'" class="absolute inset-0 flex items-center justify-center">
                        <div class="rounded-full bg-black/50 p-2">
                          <Icon name="tabler:player-play-filled" class="text-lg text-white" aria-hidden="true" />
                        </div>
                      </div>
                    </NuxtLink>
                  </TransitionGroup>
                </div>
                <p
                  v-if="initialFeedResolved && !loading && homeMediaItems.length === 0"
                  class="px-4 py-12 text-center text-sm text-gray-400 dark:text-zinc-500"
                >
                  No photos or videos yet.
                </p>
              </div>
              <p
                v-if="activeHomeFeedTab !== 'media' && initialFeedResolved && !loading && activeHomeFeedDisplayItems.length === 0"
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
import type { CommunityGroupShell, FeedPost, PostMedia, PostVisibility, CheckinAllowedVisibility  } from '~/types/api'
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
  image: '/images/logo-black-bg.png',
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
const { apiFetchData } = useApiClient()
const groupsNudgeDismissed = useCookie('moh.groups-nudge.dismissed', {
  default: () => '',
  path: '/',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
})
const myGroupsCount = ref<number | null>(null)

async function refreshMyGroupsCount() {
  if (!isAuthed.value) {
    myGroupsCount.value = null
    return
  }
  try {
    const list = await apiFetchData<CommunityGroupShell[]>('/groups/me')
    myGroupsCount.value = Array.isArray(list) ? list.length : 0
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

watch(isAuthed, (a) => {
  if (a) void refreshMyGroupsCount()
  else myGroupsCount.value = null
}, { immediate: true })

const { dayKey: etDayKey } = useEasternMidnightRollover()

const { state: checkinState, loading: checkinLoading, error: checkinError, refresh: refreshCheckin, create: createCheckin } = useDailyCheckin()
const checkinVisibility = ref<CheckinAllowedVisibility>('verifiedOnly')
const composerVisibility = useCookie<PostVisibility>('moh.post.visibility.v1', {
  default: () => 'public',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const checkinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
  const allowed = checkinState.value?.allowedVisibilities ?? []
  return Array.isArray(allowed) ? allowed : []
})

const fallbackCheckinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
  const out: CheckinAllowedVisibility[] = []
  // Product rule: ONLY verified (and above) can check in.
  if (!viewerIsVerified.value) return out
  if (viewerIsPremium.value) out.push('premiumOnly')
  out.push('verifiedOnly')
  return out
})

const effectiveCheckinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
  return checkinAllowedVisibilities.value.length ? checkinAllowedVisibilities.value : fallbackCheckinAllowedVisibilities.value
})

// True only when the user has completed today's check-in.
// This intentionally ignores "any post today" so the check-in prompt remains visible
// until a real check-in is submitted.
const hasCheckedInToday = computed(() => {
  if (!hydrated.value) return false
  return Boolean(checkinState.value?.hasCheckedInToday)
})

// Gates whether either daily-check-in hero (full or compact) is allowed to render.
// Goal: avoid a SSR/CSR flash where the full hero shows for a moment, then collapses
// into the compact one once the auth + check-in state finally resolves.
//
// Truthy when:
//   - SSR has finished and the client has mounted (hydrated), AND
//   - Either the user is unauthenticated (full hero is the obvious answer), OR
//     the check-in state has loaded (success), OR
//     the initial fetch has settled (even on error) — so the page is never
//     left blank when the API is slow or fails. In the error case we show the
//     full hero in a degraded "no crew / no streak" mode; that's always better
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
const displayCheckinCoins = computed(() => (hydrated.value ? (checkinState.value?.coins ?? 0) : 0))


const middleScrollerRef = useMiddleScroller()

onMounted(() => {
  if (!import.meta.client) return
  hydrated.value = true
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
  })
})

const newlyPostedVideoPostId = ref<string | null>(null)
let newlyPostedVideoPostTimer: ReturnType<typeof setTimeout> | null = null
type HomeFeedTabKey = 'posts' | 'replies' | 'media'

const activeHomeFeedTab = useState<HomeFeedTabKey>('home-feed-tab', () => 'posts')
const mediaOnlyFeed = computed(() => activeHomeFeedTab.value === 'media')
const topLevelOnlyFeed = computed(() => activeHomeFeedTab.value === 'posts')
const {
  feedScope,
  feedFilter,
  feedSort,
  scopeTabs,
  posts,
  displayPosts,
  collapsedSiblingReplyCountFor,
  nextCursor,
  loading,
  loadingMore,
  error,
  refresh,
  softRefreshNewer,
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

type HomeMediaItem = {
  id: string
  postId: string
  kind: PostMedia['kind']
  url: string
  thumbnailUrl: string | null
  alt: string | null
}

const homeFeedTabs: Array<{ key: HomeFeedTabKey; label: string }> = [
  { key: 'posts', label: 'Posts' },
  { key: 'replies', label: 'Replies' },
  { key: 'media', label: 'Media' },
]

const homeFeedTabBarEl = ref<HTMLElement | null>(null)
const homeFeedTabButtonEls = new Map<HomeFeedTabKey, HTMLElement>()
const homeFeedUnderlineLeft = ref(0)
const homeFeedUnderlineWidth = ref(0)
const homeFeedUnderlineReady = ref(false)

function setHomeFeedTabButtonRef(key: HomeFeedTabKey, el: HTMLElement | null) {
  if (el) homeFeedTabButtonEls.set(key, el)
  else homeFeedTabButtonEls.delete(key)
}

function updateHomeFeedUnderline() {
  if (!import.meta.client) return
  const bar = homeFeedTabBarEl.value
  const btn = homeFeedTabButtonEls.get(activeHomeFeedTab.value)
  if (!bar || !btn) return
  const barRect = bar.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  homeFeedUnderlineLeft.value = Math.round(btnRect.left - barRect.left)
  homeFeedUnderlineWidth.value = Math.round(btnRect.width)
}

function setHomeFeedTab(key: HomeFeedTabKey) {
  if (activeHomeFeedTab.value === key) return
  activeHomeFeedTab.value = key
}

const activeHomeFeedDisplayItems = computed(() => {
  return displayItems.value
})

function collectHomeMediaItem(post: FeedPost, media: PostMedia): HomeMediaItem | null {
  const url = (media.url ?? '').trim()
  if (!url) return null
  return {
    id: `${post.id}:${media.id}`,
    postId: post.id,
    kind: media.kind,
    url,
    thumbnailUrl: (media.thumbnailUrl ?? '').trim() || null,
    alt: media.alt ?? null,
  }
}

const homeMediaItems = computed<HomeMediaItem[]>(() => {
  const out: HomeMediaItem[] = []
  const seen = new Set<string>()
  for (const post of displayPosts.value) {
    for (const media of post.media ?? []) {
      if (media.deletedAt) continue
      const item = collectHomeMediaItem(post, media)
      if (!item || seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
    }
  }
  return out
})

watch(activeHomeFeedTab, () => nextTick(updateHomeFeedUnderline))
onMounted(() => nextTick(() => {
  updateHomeFeedUnderline()
  requestAnimationFrame(() => { homeFeedUnderlineReady.value = true })
}))

watch(
  [isAuthed, etDayKey],
  ([authed]) => {
    if (!authed) {
      checkinState.value = null
      return
    }
    void refreshCheckin()
  },
  { immediate: true },
)

watch(
  checkinAllowedVisibilities,
  (allowed) => {
    if (allowed.length && !allowed.includes(checkinVisibility.value)) {
      checkinVisibility.value = allowed[0]!
    }
  },
  { immediate: true },
)

function preferredCheckinVisibility(): CheckinAllowedVisibility {
  const allowed = checkinAllowedVisibilities.value
  if (!allowed.length) return 'verifiedOnly'
  const current = composerVisibility.value
  const preferred: CheckinAllowedVisibility = current === 'premiumOnly' ? 'premiumOnly' : 'verifiedOnly'
  return allowed.includes(preferred) ? preferred : allowed[0]!
}

/**
 * Last submitted check-in body for the hero's "you answered today" echo. Cleared on
 * day rollover so it doesn't bleed into tomorrow's prompt state.
 */
const lastCheckinBody = ref<string | null>(null)
watch(etDayKey, () => { lastCheckinBody.value = null })

async function createCheckinViaComposer(
  body: string,
  visibility: PostVisibility,
  _media?: unknown[] | null,
  _poll?: unknown,
): Promise<{ id: string } | import('~/types/api').FeedPost | null> {
  const trimmed = body.trim()
  if (!trimmed) return null
  const vis: CheckinAllowedVisibility = visibility === 'premiumOnly' ? 'premiumOnly' : 'verifiedOnly'
  const res = await createCheckin({ body: trimmed, visibility: vis })
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
  const allowed = effectiveCheckinAllowedVisibilities.value
  if (!allowed.length) return
  const preferred = preferredCheckinVisibility()
  checkinVisibility.value = preferred
  openComposer({
    visibility: preferred,
    placeholder: checkinState.value?.prompt ? checkinState.value.prompt : 'Write a check-in…',
    allowedVisibilities: allowed,
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
const initialFeedLoadStarted = ref(false)
const initialFeedResolved = ref(false)

watchEffect(() => {
  if (initialFeedResolved.value) return
  if (posts.value.length > 0 || Boolean(error.value)) {
    initialFeedResolved.value = true
    return
  }
  if (loading.value) {
    initialFeedLoadStarted.value = true
    return
  }
  if (initialFeedLoadStarted.value && !loading.value) {
    // First request completed with an empty feed (no error).
    initialFeedResolved.value = true
  }
})

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
    prependToHomeFeed(post)
  },
}

let unregisterReplyPending: null | (() => void) = null
onActivated(() => {
  if (!import.meta.client) return
  if (isAuthed.value) void refreshMyGroupsCount()
  if (posts.value.length > 0) {
    // Posts are already in memory (keepalive). Soft-refresh only fetches posts newer than the
    // current head and prepends them, preserving the scroll position via anchor adjustment.
    // We delay by 300ms so this runs after the scroll-restoration plugin's 200ms re-apply,
    // preventing the two position adjustments from conflicting.
    setTimeout(() => void softRefreshNewer(), 300)
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
/* Enter animation for newly prepended feed posts (real-time from followed users or soft-refresh). */
.feed-post-enter-active {
  transition: opacity 350ms ease, transform 350ms ease;
}
.feed-post-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.feed-post-enter-to {
  opacity: 1;
  transform: translateY(0);
}
/* Existing rows must not animate when something is added/removed above them, and rows being
   removed (e.g. parent post replaced by an optimistic reply) should disappear instantly so the
   new row is the only thing the eye tracks. Vue's TransitionGroup defaults to a 0.5s move
   transform; we override it here. */
.feed-post-move,
.feed-post-leave-active {
  transition: none !important;
}
.feed-post-leave-from,
.feed-post-leave-to {
  opacity: 0;
}

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
