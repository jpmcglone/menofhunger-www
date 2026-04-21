<template>
  <AppPageContent bottom="standard">
    <div v-if="loading" class="flex justify-center py-16">
      <AppLogoLoader />
    </div>

    <div v-else-if="notFound" class="moh-gutter-x pt-10 pb-16 max-w-xl mx-auto text-center space-y-3">
      <Icon name="tabler:shield-off" class="text-3xl opacity-60" aria-hidden="true" />
      <h1 class="moh-h1">Crew not found</h1>
      <p class="text-sm moh-text-muted">
        This Crew may have disbanded or changed its name.
      </p>
      <Button as="NuxtLink" to="/" label="Back home" rounded />
    </div>

    <div v-else-if="crew" class="pb-10">
      <!-- Cover banner -->
      <div class="relative h-40 md:h-56 w-full bg-gray-200 dark:bg-zinc-800">
        <img
          v-if="crew.coverUrl"
          :src="crew.coverUrl"
          alt=""
          class="h-full w-full object-cover"
        >
      </div>

      <!-- Header (avatar + name + tagline + meta + actions) -->
      <div class="moh-gutter-x -mt-12 md:-mt-14 relative max-w-3xl mx-auto">
        <div class="flex items-end gap-4">
          <div
            class="h-24 w-24 md:h-28 md:w-28 overflow-hidden ring-4 ring-[var(--moh-bg)] bg-gray-200 dark:bg-zinc-800 shrink-0"
            :class="crewAvatarRound"
          >
            <img
              v-if="crew.avatarUrl"
              :src="crew.avatarUrl"
              alt=""
              class="h-full w-full object-cover"
            >
          </div>
          <div class="flex-1 min-w-0 pb-2">
            <h1 class="text-2xl font-semibold moh-text truncate">{{ crewName }}</h1>
            <p v-if="crew.tagline" class="mt-1 text-sm moh-text-muted">{{ crew.tagline }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <!-- Member-only: open the crew chat. Badge mirrors the unread count
                 returned with viewerMembership; clicking optimistically clears it. -->
            <NuxtLink
              v-if="isMember && viewerMembership"
              :to="`/chat?c=${encodeURIComponent(viewerMembership.wallConversationId)}`"
              class="relative rounded-full border moh-border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-900 inline-flex items-center gap-1"
              :aria-label="unreadChatCount > 0 ? `Open crew chat (${unreadChatCount} unread)` : 'Open crew chat'"
              @click="onOpenChat"
            >
              <Icon name="tabler:message-circle" aria-hidden="true" />
              <span>Chat</span>
              <span
                v-if="unreadChatCount > 0"
                class="ml-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white tabular-nums"
                aria-hidden="true"
              >
                <AppAnimatedCount :value="unreadChatCount" :format="(n) => (n > 99 ? '99+' : String(n))" />
              </span>
            </NuxtLink>
            <Button
              v-if="isOwner"
              label="Edit Crew"
              rounded
              size="small"
              severity="secondary"
              @click="editCrewOpen = true"
            >
              <template #icon>
                <Icon name="tabler:edit" aria-hidden="true" />
              </template>
            </Button>
            <Button
              v-else-if="isMember"
              label="Leave"
              rounded
              size="small"
              severity="secondary"
              :loading="leaving"
              @click="confirmLeave"
            >
              <template #icon>
                <Icon name="tabler:logout" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <!-- Meta row -->
        <div class="mt-4 text-xs moh-text-muted flex flex-wrap items-center gap-2">
          <Icon name="tabler:users" aria-hidden="true" />
          <NuxtLink
            :to="`/c/${encodeURIComponent(crew.slug)}/members`"
            class="hover:underline tabular-nums"
          >
            {{ crew.memberCount }} {{ crew.memberCount === 1 ? 'member' : 'members' }}
          </NuxtLink>
          <span>·</span>
          <span>Formed {{ formatDate(crew.createdAt) }}</span>
        </div>

        <!-- Bio: shown to everyone who can see the page -->
        <section v-if="crew.bio" class="mt-6 rounded-xl border moh-border p-4">
          <p class="text-sm moh-text whitespace-pre-line">{{ crew.bio }}</p>
        </section>

        <!-- Crew member strip (5 fixed slots) -->
        <section class="mt-6">
          <AppCrewMemberStrip
            v-if="crew.members.length > 0 || isOwner"
            :members="crew.members"
            :is-owner="isOwner"
            :can-add-member="canAddMember"
            @add-member="addMemberOpen = true"
          />
        </section>

        <!-- Posts feed: posts authored by crew members, filtered by visibility
             on the server (viewer only sees what they're allowed to see). Behaves
             like the home feed scoped to this crew's roster. -->
        <section class="mt-6">
          <div class="sticky top-0 z-20 -mx-4 px-4 py-1.5 border-b moh-border moh-surface flex justify-between items-center mb-3">
            <h2 class="text-sm font-semibold moh-text uppercase tracking-wide">Posts</h2>
            <AppFeedFiltersBar
              :sort="feedSort"
              :filter="feedFilter"
              :viewer-is-verified="viewerIsVerified"
              :viewer-is-premium="viewerIsPremium"
              :show-reset="isFiltered"
              @update:sort="feedSort = $event"
              @update:filter="onCrewFeedFilterChange"
              @reset="resetFilters()"
            />
          </div>

          <AppInlineAlert v-if="feedError" class="mb-3" severity="danger">
            {{ feedError }}
          </AppInlineAlert>

          <AppSubtleSectionLoader :loading="feedLoading && !posts.length" min-height-class="min-h-[200px]">
            <div v-if="!posts.length && !feedLoading" class="px-3 py-6 text-sm moh-text-muted text-center">
              No posts from this crew yet.
            </div>
            <div v-else class="relative">
              <template v-for="item in displayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
                <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                <AppFeedPostRow
                  v-else
                  :post="item.post"
                  :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(item.post)"
                  @deleted="removePost"
                  @edited="onEdited"
                />
              </template>
            </div>
          </AppSubtleSectionLoader>

          <div v-if="nextCursor" class="relative flex justify-center items-center py-6 min-h-12">
            <div ref="loadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
            <div
              class="transition-opacity duration-150"
              :class="loadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'"
              :aria-hidden="!loadingMore"
            >
              <AppLogoLoader compact />
            </div>
          </div>
        </section>
      </div>
    </div>

    <AppCrewEditCrewDialog
      v-if="crew"
      v-model="editCrewOpen"
      :crew="crew"
      :is-owner="isOwner"
      :designated-successor-user-id="viewerMembership?.designatedSuccessorUserId ?? null"
      @updated="onCrewUpdated"
      @disbanded="onCrewDisbanded"
    />

    <AppCrewAddCrewMemberDialog
      v-if="isOwner && crew"
      v-model="addMemberOpen"
      :exclude-user-ids="addMemberExcludeIds"
      @invited="onMemberInvited"
    />
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CrewBySlugViewerMembership, CrewPrivate, CrewPublic, FeedPost } from '~/types/api'
import { useLoadMoreObserver } from '~/composables/useLoadMoreObserver'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import type { CrewCallback, WsCrewWallPayload } from '~/composables/usePresence'
import { getApiErrorMessage } from '~/utils/api-error'
import { crewAvatarRoundClass } from '~/utils/avatar-rounding'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import type { FeedVisibilityFilter } from '~/composables/useFeedFilters'

const crewAvatarRound = crewAvatarRoundClass()

definePageMeta({
  layout: 'app',
  title: 'Crew',
  hideTopBar: true,
})

const route = useRoute()

const loading = ref(true)
const notFound = ref(false)
const crew = ref<CrewPublic | null>(null)
const viewerMembership = ref<CrewBySlugViewerMembership | null>(null)
const canonicalSlug = ref<string | null>(null)
// Local override so we can optimistically zero the badge when the viewer clicks
// "Chat" (and bump it on `crew:wall:new` events while they're on the page).
const unreadChatOverride = ref<number | null>(null)

const crewApi = useCrew()
const { addCrewCallback, removeCrewCallback } = usePresence()
const { user: meUser } = useAuth()
const { markReadBySubject } = useNotifications()

const crewName = computed(() => {
  const n = (crew.value?.name ?? '').trim()
  return n.length > 0 ? n : 'Untitled Crew'
})

const isMember = computed(() => Boolean(viewerMembership.value))
const isOwner = computed(() => viewerMembership.value?.role === 'owner')

const editCrewOpen = ref(false)
const addMemberOpen = ref(false)
const leaving = ref(false)

// Add-member dialog: exclude current members + pending invitees
const addMemberExcludeIds = computed<string[]>(() => {
  const ids = new Set<string>()
  for (const m of crew.value?.members ?? []) ids.add(m.user.id)
  return [...ids]
})

const canAddMember = computed(
  () => isOwner.value && (crew.value?.memberCount ?? 0) < 5,
)

const viewerCrew = useViewerCrew()

const unreadChatCount = computed(() => {
  if (unreadChatOverride.value !== null) return unreadChatOverride.value
  return viewerMembership.value?.unreadChatCount ?? 0
})

// Roster of user IDs to filter the feed by. Stable per slug; recomputed on
// realtime member changes via the `load()` refetch.
const crewMemberAuthorIds = computed<string[]>(() =>
  (crew.value?.members ?? []).map((m) => m.user.id).filter(Boolean),
)

const feedEnabled = computed(() => Boolean(crew.value && crewMemberAuthorIds.value.length > 0))

const {
  sort: feedSort,
  filter: feedFilter,
  viewerIsVerified,
  viewerIsPremium,
  isFiltered,
  resetFilters,
} = useUrlFeedFilters()

const {
  posts,
  displayItems,
  collapsedSiblingReplyCountFor,
  nextCursor,
  loading: feedLoading,
  loadingMore,
  error: feedError,
  refresh: feedRefresh,
  loadMore,
  removePost,
  replacePost,
} = usePostsFeed({
  feedStateKey: 'crew-feed',
  cursorFeedStateMode: 'local',
  localInsertsStateKey: 'crew-feed-local-inserts',
  authorIds: crewMemberAuthorIds,
  enabled: feedEnabled,
  visibility: feedFilter,
  followingOnly: ref(false),
  sort: feedSort,
  showAds: ref(false),
})

// FeedFiltersBar emits the wider ProfilePostsFilter (which includes 'onlyMe'),
// but the crew feed only supports the FeedVisibilityFilter set. Coerce 'onlyMe'
// to 'all' so the assignment type-checks and the URL stays in a valid state.
function onCrewFeedFilterChange(next: ProfilePostsFilter) {
  feedFilter.value = next === 'onlyMe' ? 'all' : (next as FeedVisibilityFilter)
}

const seoDescription = computed(
  () => crew.value?.tagline ?? 'A Crew on Men of Hunger — verified men holding each other accountable.',
)
const seoCanonical = computed(() => `/c/${canonicalSlug.value ?? String(route.params.slug)}`)

usePageSeo({
  title: crewName,
  description: seoDescription,
  canonicalPath: seoCanonical,
})

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function onEdited(payload: { id: string; post: FeedPost }) {
  replacePost(payload.post)
}

function onOpenChat() {
  // Reading the chat clears its unread count server-side; reflect that locally
  // so the badge disappears immediately instead of waiting for a refetch.
  unreadChatOverride.value = 0
}

// Optimistically reflect dialog edits in the page header. We splice the
// CrewPrivate response into our CrewPublic ref (CrewPrivate extends CrewPublic)
// and update the viewer-specific successor field. A `crew:updated` socket
// event will trigger a full refetch right after, so this is mostly to avoid a
// brief stale-render flash.
function onCrewUpdated(updated: CrewPrivate) {
  crew.value = updated
  if (viewerMembership.value) {
    viewerMembership.value = {
      ...viewerMembership.value,
      designatedSuccessorUserId: updated.designatedSuccessorUserId,
    }
  }
  if (import.meta.client && updated.slug && updated.slug !== String(route.params.slug)) {
    void navigateTo(`/c/${encodeURIComponent(updated.slug)}`, { replace: true })
  }
}

function onMemberInvited() {
  // Refresh crew data to get updated pending invite count
  void load()
}

function onCrewDisbanded() {
  viewerCrew.clear()
  void navigateTo('/crew', { replace: true })
}

async function confirmLeave() {
  if (!isMember.value || isOwner.value) return
  if (!confirm('Leave this Crew? You can be re-invited later.')) return
  leaving.value = true
  try {
    await crewApi.leaveCrew()
    viewerCrew.clear()
    void navigateTo('/crew', { replace: true })
  } catch (e) {
    alert(getApiErrorMessage(e) || 'Could not leave the Crew.')
  } finally {
    leaving.value = false
  }
}

const loadMoreSentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()
useLoadMoreObserver(
  loadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(nextCursor.value)),
  () => void loadMore(),
)

async function load() {
  const slug = String(route.params.slug || '').toLowerCase()
  if (!slug) {
    notFound.value = true
    loading.value = false
    return
  }
  loading.value = true
  notFound.value = false
  try {
    const res = await crewApi.getCrewBySlug(slug)
    crew.value = res.crew
    viewerMembership.value = res.viewerMembership
    canonicalSlug.value = res.crew.slug
    // A fresh server count supersedes any local optimistic override.
    unreadChatOverride.value = null
    // Visiting a crew page surfaces every crew_* notification (members joining/leaving,
    // wall mentions, owner changes, invite outcomes, etc.) — clear them all in one shot.
    if (import.meta.client && res.viewerMembership && res.crew.id) {
      void markReadBySubject({ crew_id: res.crew.id })
    }
    if (import.meta.client && res.crew.slug && res.crew.slug !== slug) {
      void navigateTo(`/c/${encodeURIComponent(res.crew.slug)}`, { replace: true })
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, () => {
  void load()
})

// Realtime: refresh the page when something material changes about the crew
// (rename, members joined/left, new owner). The feed component refreshes
// automatically when `crewMemberAuthorIds` changes (member join/leave).
const realtimeCb: CrewCallback = {
  onUpdated() {
    void load()
  },
  onMembersChanged() {
    void load()
  },
  onOwnerChanged() {
    void load()
  },
  onDisbanded() {
    notFound.value = true
    crew.value = null
  },
  onWallNew(payload: WsCrewWallPayload) {
    // Bump the chat badge for new messages on this crew while we're on the page,
    // unless the message was just sent by the viewer themselves.
    if (!crew.value || payload?.crewId !== crew.value.id) return
    const meId = meUser.value?.id ?? null
    const senderId = (payload?.message as { senderId?: string | null } | null | undefined)?.senderId ?? null
    if (meId && senderId === meId) return
    const base = unreadChatOverride.value ?? viewerMembership.value?.unreadChatCount ?? 0
    unreadChatOverride.value = base + 1
  },
}
onMounted(() => addCrewCallback(realtimeCb))
onBeforeUnmount(() => removeCrewCallback(realtimeCb))

onMounted(() => {
  // Fire the initial feed load once roster + auth are settled (the composable's
  // watcher won't fire for the first render since values haven't changed).
  if (feedEnabled.value && !posts.value.length) void feedRefresh()
})

void load()
</script>
