<template>
  <!-- hideTopBar page: no top padding here -->
  <AppPageContent bottom="standard">
    <!-- Layout: Composer at top, feed below. Wrapper ref used to detect when composer is in view (hides mobile FAB). -->
    <div ref="homeComposerEl" class="min-h-0">
      <AppPostComposer
        v-if="!showOnlyMeHomeComposerCard"
        ref="homeComposerRef"
        :create-post="createPostViaFeed"
        :allowed-visibilities="['public', 'verifiedOnly', 'premiumOnly']"
        persist-key="home"
        :register-unsaved-guard="false"
      />
      <div v-else class="px-3 pt-3 sm:px-4 sm:pt-4">
        <div class="rounded-2xl border moh-border moh-surface p-4 sm:p-5">
          <div class="flex items-start gap-3">
            <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl moh-btn-onlyme moh-btn-tone">
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

    <Transition
      enter-active-class="transition-all duration-250 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-220 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1 max-h-0"
    >
      <!-- v-show keeps a single root element so SSR and client agree (avoids hydration mismatch) -->
      <div v-show="showCheckinPromptBar" class="px-3 pt-2.5 pb-2.5 sm:px-4 sm:pt-3 sm:pb-3">
        <div class="rounded-xl moh-surface/60 px-3 py-2.5">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div
                class="text-xs sm:text-[13px] leading-snug moh-text-muted opacity-80 moh-serif"
                style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;"
              >
                {{ displayCheckinPromptText }}
              </div>
            </div>
            <Button
              label="Check in"
              size="small"
              rounded
              :class="['shrink-0 !h-10 !min-h-10 !px-4 !py-0 !leading-none whitespace-nowrap', checkinButtonClass]"
              @click="openCheckinComposer"
            />
          </div>
          <AppInlineAlert v-if="checkinError" class="mt-2" severity="danger">
            {{ checkinError }}
          </AppInlineAlert>
        </div>
      </div>
    </Transition>

    <!-- Feed: header + content -->
    <div>
      <AppFeedHomeFeedHeader
        :scope="feedScope"
        :sort="feedSort"
        :filter="feedFilter"
        :scope-tabs="scopeTabs"
        :viewer-is-verified="viewerIsVerified"
        :viewer-is-premium="viewerIsPremium"
        :show-reset="feedFilter !== 'all' || feedSort !== 'new'"
        @update:scope="onFeedScopeChange"
        @update:sort="setFeedSort"
        @update:filter="setFeedFilter"
        @reset="() => void resetFilters()"
      />

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

        <div class="relative">
          <!-- Loader: always in DOM, opacity 0/1, z-0 (below feed). Visible when loading and no posts. -->
          <div
            class="absolute inset-x-0 top-0 flex justify-center items-center min-h-[240px] transition-opacity duration-150 z-0"
            :class="showMainLoader ? 'opacity-100' : 'opacity-0 pointer-events-none'"
            :aria-hidden="!showMainLoader"
          >
            <AppLogoLoader />
          </div>

          <!-- Feed: always in flow (no movement), z-10 so above loader. Hidden when loader visible. -->
          <div
            class="relative z-10"
            :class="showMainLoader ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          >
            <AppFeedFollowingEmptyState
              v-if="showFollowingEmptyState"
              :following-count="followingCount"
              @find-people="navigateTo('/explore')"
            />
            <AppFeedAllEmptyState
              v-else-if="showAllEmptyState"
              @explore="navigateTo('/explore')"
              @who-to-follow="navigateTo('/who-to-follow')"
            />

            <div class="relative">
              <template v-for="item in displayItems" :key="item.kind === 'ad' ? item.key : item.post.id">
                <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                <AppFeedPostRow
                  v-else
                  :post="item.post"
                  :activate-video-on-mount="item.post.id === newlyPostedVideoPostId"
                  :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(item.post)"
                  :reply-count-for-parent-id="replyCountForParentId"
                  :replies-sort="feedSort"
                  @deleted="removePost"
                  @edited="onFeedPostEdited"
                />
              </template>
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
                :class="loading ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!loading"
              >
                <AppLogoLoader compact />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { PostVisibility } from '~/types/api'
import type { CreateMediaPayload } from '~/composables/useComposerMedia'
import type { ComposerPollPayload } from '~/composables/composer/types'
import { postBodyHasVideoEmbed } from '~/utils/link-utils'
import { MOH_HOME_COMPOSER_IN_VIEW_KEY, MOH_OPEN_COMPOSER_KEY, MOH_FOCUS_HOME_COMPOSER_KEY } from '~/utils/injection-keys'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import type { CheckinAllowedVisibility } from '~/types/api'

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
const { isAuthed } = useAuth()
const { dayKey: etDayKey } = useEasternMidnightRollover()

const { state: checkinState, error: checkinError, refresh: refreshCheckin, create: createCheckin } = useDailyCheckin()
const checkinVisibility = ref<CheckinAllowedVisibility>('verifiedOnly')
// TEMP: force the prompt bar to show while debugging check-in UX.
const FORCE_SHOW_CHECKIN_PROMPT_BAR = false
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

const showCheckinPromptBar = computed(() => {
  if (!isAuthed.value) return false
  // Avoid showing check-in card when main feed is blocked by a gate CTA.
  if (feedCtaKind.value) return false
  if (FORCE_SHOW_CHECKIN_PROMPT_BAR) return true
  if (!checkinState.value) return false
  if (checkinState.value.hasCheckedInToday) return false
  if (!effectiveCheckinAllowedVisibilities.value.length) return false
  return true
})

const checkinPromptText = computed(() => {
  const p = (checkinState.value?.prompt ?? '').trim()
  return p || 'Write a check-in…'
})

// Use fallback text until after hydration so server and client match (checkinState can differ on SSR vs client).
const hydrated = ref(false)
const displayCheckinPromptText = computed(() => (hydrated.value ? checkinPromptText.value : 'Write a check-in…'))

const checkinButtonClass = computed(() => {
  // Match the Post button tone when it's tier-scoped; otherwise keep check-in as Verified.
  const v = composerVisibility.value
  if (v === 'premiumOnly') return 'moh-btn-premium moh-btn-tone'
  if (v === 'verifiedOnly') return 'moh-btn-verified moh-btn-tone'
  return 'moh-btn-verified moh-btn-tone'
})

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
const {
  feedScope,
  feedFilter,
  feedSort,
  scopeTabs,
  posts,
  displayPosts,
  collapsedSiblingReplyCountFor,
  replyCountForParentId,
  nextCursor,
  loading,
  error,
  refresh,
  loadMore,
  addPost,
  addReply,
  removePost,
  replacePost,
  followingCount,
  showFollowingEmptyState,
  showAllEmptyState,
  viewerIsVerified,
  viewerIsPremium,
  feedCtaKind,
  displayItems,
  setFeedFilter,
  setFeedSort,
  resetFilters,
} = useHomeFeed()

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
  posts.value = [res.post, ...posts.value.filter((p) => p.id !== res.post.id)]
  return res.post
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

const showMainLoader = computed(() => loading.value && !posts.value.length)
const showOnlyMeHomeComposerCard = computed(() => isAuthed.value && !viewerIsVerified.value)

function openOnlyMeComposer() {
  openComposer?.('onlyMe')
}

const replyModal = useReplyModal()
let unregisterReplyPosted: null | (() => void) = null
onActivated(() => {
  if (!import.meta.client) return
  void refresh()
  const cb = (payload: import('~/composables/useReplyModal').ReplyPostedPayload) => {
    const parent = replyModal.parentPost.value
    if (!parent?.id || !payload.post) return
    addReply(parent.id, payload.post, parent)
  }
  unregisterReplyPosted = replyModal.registerOnReplyPosted(cb)
})
onDeactivated(() => {
  unregisterReplyPosted?.()
  unregisterReplyPosted = null
})

async function createPostViaFeed(
  body: string,
  visibility: PostVisibility,
  media?: CreateMediaPayload[] | null,
  poll?: ComposerPollPayload | null,
): Promise<{ id: string } | null> {
  // Home composer should never pass 'existing' media references, but ignore safely if it ever does.
  const filtered = (media ?? []).filter((m) => (m as any)?.source !== 'existing') as any
  const created = await addPost(body, visibility, filtered.length ? filtered : null, poll ?? null)
  if (created?.id) {
    if (postBodyHasVideoEmbed(created.body ?? '', Boolean(created.media?.length))) {
      newlyPostedVideoPostId.value = created.id
      if (import.meta.client) {
        if (newlyPostedVideoPostTimer) clearTimeout(newlyPostedVideoPostTimer)
        newlyPostedVideoPostTimer = setTimeout(() => {
          newlyPostedVideoPostId.value = null
          newlyPostedVideoPostTimer = null
        }, 800)
      }
    }
    // Do not hard-refresh the whole feed after posting; `addPost` already prepends.
  }
  return created?.id ? { id: created.id } : null
}

function onFeedScopeChange(v: 'following' | 'all') {
  feedScope.value = v
}

if (import.meta.server) await refresh()
</script>
