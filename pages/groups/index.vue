<template>
  <AppPageContent bottom="standard" class="relative">
    <AppRefreshIndicator :loading="(metaLoading && !metaInitialLoading) || searchLoading" />
    <div class="w-full">
      <!-- Header band: edge-to-edge with gutter padding, divided by border-b. -->
      <div class="moh-gutter-x border-b moh-border pb-4 pt-4 space-y-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <h1 class="moh-h1">Groups</h1>
            <p class="mt-1 moh-meta max-w-xl">
              {{ mine.length ? 'Jump into one of your groups, or find another community.' : 'Find a community to join. Each group is its own space.' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0 sm:pt-1">
            <Button
              v-if="isAuthed && canCreateGroup"
              as="NuxtLink"
              to="/groups/new"
              label="Create group"
              rounded
            >
              <template #icon>
                <Icon name="tabler:plus" aria-hidden="true" />
              </template>
            </Button>
            <Button
              v-else-if="isAuthed"
              as="NuxtLink"
              to="/tiers"
              label="Upgrade to create"
              rounded
              severity="secondary"
            >
              <template #icon>
                <Icon name="tabler:sparkles" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <AppInlineAlert v-if="metaError" severity="danger">
          {{ metaError }}
        </AppInlineAlert>
      </div>

      <template v-if="isAuthed">
        <section v-if="inboxInvites.length" class="border-b moh-border py-3" aria-labelledby="groups-invites-heading">
          <button type="button" class="moh-focus moh-gutter-x flex min-h-11 w-full items-center justify-between gap-3 text-left" :aria-expanded="invitesExpanded" @click="invitesExpanded = !invitesExpanded">
            <span id="groups-invites-heading" class="text-sm font-semibold">{{ inboxInvites.length }} group {{ inboxInvites.length === 1 ? 'invitation' : 'invitations' }}</span>
            <span class="text-sm moh-text-muted">{{ invitesExpanded || !mine.length ? 'Hide' : 'Review' }}</span>
          </button>
          <ul v-show="invitesExpanded || !mine.length" class="moh-divide">
            <li v-for="inv in inboxInvites" :key="inv.id">
              <AppGroupsInviteInboxRow :invite="inv" @accepted="removeInboxInvite(inv.id)" @declined="removeInboxInvite(inv.id)" />
            </li>
          </ul>
        </section>

        <section v-if="mine.length" class="border-b moh-border py-3" aria-labelledby="groups-mine-heading">
          <h2 id="groups-mine-heading" class="moh-gutter-x pb-1 text-sm font-semibold uppercase tracking-wide moh-text-muted">Your groups</h2>
          <div class="grid px-1 sm:grid-cols-2 sm:px-3">
            <AppGroupsGroupRow v-for="group in mine" :key="group.id" :group="group" :new-count="groupsUnread.byGroupId[group.id] ?? 0" />
          </div>
        </section>
      </template>

      <!-- Discover section -->
      <section class="pt-5" aria-labelledby="explore-discover-heading">
        <div class="moh-gutter-x space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="explore-discover-heading" class="text-sm font-semibold uppercase tracking-wide moh-text-muted">
              {{ hasQuery ? 'Search results' : mine.length ? 'Find more groups' : 'Discover' }}
            </h2>
            <span v-if="!hasQuery && spotlightCount" class="text-xs moh-text-muted tabular-nums">
              {{ spotlightCount }}
            </span>
          </div>

          <IconField icon-position="left" class="w-full">
            <InputIcon>
              <Icon name="tabler:search" class="text-lg opacity-70" aria-hidden="true" />
            </InputIcon>
            <InputText
              v-model="searchInput"
              class="w-full"
              :placeholder="isAuthed ? 'Search groups by name…' : 'Search open groups by name…'"
              autocomplete="off"
              aria-label="Search groups"
            />
          </IconField>
        </div>

        <AppInlineAlert v-if="searchError" class="moh-gutter-x mt-3" severity="danger">
          {{ searchError }}
        </AppInlineAlert>

        <!-- Initial spotlight loading -->
        <div v-if="metaInitialLoading" class="flex justify-center py-10">
          <AppLogoLoader />
        </div>

        <!-- Empty state: search returned nothing -->
        <AppScreenState
          v-else-if="hasQuery && !searchLoading && searchResults.length === 0"
          title="No matching groups" icon="search" :description="`No groups match “${trimmedQuery}”. Try a different name.`" />
        <AppScreenState
          v-else-if="!hasQuery && discoverRows.length === 0" title="No new groups" icon="group"
          :description="isAuthed ? 'You’re in every group we have right now.' : 'Check back soon for new groups.'" />

        <!-- Result list — full-bleed divided rows. NO outer card wrapper. -->
        <div
          v-else
          class="mt-3 moh-divide"
        >
          <NuxtLink
            v-for="g in discoverRows"
            :key="g.id"
            :to="`/g/${encodeURIComponent(g.slug)}`"
            class="relative flex items-center gap-3 px-4 sm:px-6 py-4 overflow-hidden hover:bg-gray-50/60 dark:hover:bg-zinc-900/40 transition-colors"
          >
            <div
              v-if="g.coverImageUrl"
              class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.04]"
              :style="{ backgroundImage: `url(${g.coverImageUrl})` }"
              aria-hidden="true"
            />

            <!-- Owner crown: top-right of the row, just the icon (yellow).
                 Mirrors AppGroupCompactCard so ownership reads consistently
                 across carousel + list + search. -->
            <Icon
              v-if="g.viewerMembership?.role === 'owner' && g.viewerMembership.status === 'active'"
              name="tabler:crown-filled"
              class="absolute top-2 right-3 z-[1] text-base text-amber-400"
              :title="`You own ${g.name}`"
              :aria-label="`You own ${g.name}`"
            />

            <div
              class="relative h-12 w-12 shrink-0 overflow-hidden bg-gray-200 dark:bg-zinc-800"
              :class="avatarRoundClass"
            >
              <img
                v-if="g.avatarImageUrl"
                :src="g.avatarImageUrl"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-sm font-bold moh-text"
              >
                {{ initials(g.name) }}
              </div>
            </div>
            <div class="relative min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium moh-text">{{ g.name }}</span>
                <!-- Membership comes FIRST — most relevant signal for search
                     results. "Member" trumps the visibility chip visually. -->
                <span
                  v-if="g.viewerMembership?.status === 'active'"
                  class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[color:rgba(var(--moh-group-rgb),0.18)] text-[color:var(--moh-group)]"
                >
                  <Icon name="tabler:check" class="text-[10px]" aria-hidden="true" />
                  {{ g.viewerMembership.role === 'owner' ? 'Owner' : g.viewerMembership.role === 'moderator' ? 'Moderator' : 'Member' }}
                </span>
                <span
                  v-else-if="g.viewerMembership?.status === 'pending'"
                  class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded border moh-border moh-text-muted"
                >
                  <Icon name="tabler:clock" class="text-[10px]" aria-hidden="true" />
                  Requested
                </span>
                <span
                  v-if="g.joinPolicy === 'approval'"
                  class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded border moh-border moh-text-muted"
                >
                  <Icon name="tabler:lock" class="text-[10px]" aria-hidden="true" />
                  Approval
                </span>
                <span
                  v-else
                  class="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                >
                  Open
                </span>
              </div>
              <p
                v-if="g.description"
                class="mt-0.5 text-sm moh-text-muted line-clamp-2"
              >
                {{ g.description }}
              </p>
              <div class="mt-1 text-xs moh-text-muted tabular-nums">
                {{ g.memberCount.toLocaleString() }} members
              </div>
            </div>
            <Icon
              name="tabler:chevron-right"
              class="relative text-lg opacity-50 shrink-0"
              aria-hidden="true"
            />
          </NuxtLink>
        </div>

        <!-- Pagination sentinel + loader (drives both spotlight and search) -->
        <div
          v-if="hasNextPage || isPaginating"
          class="relative flex justify-center items-center py-6 min-h-12"
        >
          <div ref="loadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
          <div
            class="transition-opacity duration-150"
            :class="isPaginating ? 'opacity-100' : 'opacity-0 pointer-events-none'"
            :aria-hidden="!isPaginating"
          >
            <AppLogoLoader compact />
          </div>
        </div>
      </section>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupInvite, CommunityGroupShell } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'
import { useLoadMoreObserver } from '~/composables/useLoadMoreObserver'
import { useMiddleScroller } from '~/composables/useMiddleScroller'

definePageMeta({
  layout: 'app',
  title: 'Groups',
  hideTopBar: true,
})

usePageSeo({
  title: 'Groups',
  description: 'Your groups and communities to join on Men of Hunger.',
  canonicalPath: '/groups',
  noindex: true,
})

const { user, isAuthed } = useAuth()
const { groupsUnread, addGroupInviteCallback, removeGroupInviteCallback } = usePresence()
const { clearLockScreen } = useNotifications()
const { groups: sharedMyGroups, load: loadMyGroups } = useMyGroups()
const groupInvitesApi = useGroupInvites()
const { setCount: setGroupInviteBadgeCount } = useGroupInvitesBadge()
const mine = computed(() => (isAuthed.value ? sharedMyGroups.value : []))
const inboxInvites = ref<CommunityGroupInvite[]>([])
const invitesExpanded = ref(false)

function removeInboxInvite(inviteId: string) {
  inboxInvites.value = inboxInvites.value.filter((i) => i.id !== inviteId)
  setGroupInviteBadgeCount(inboxInvites.value.length)
}
async function loadInbox() {
  if (!isAuthed.value) return
  try {
    inboxInvites.value = (await groupInvitesApi.listInbox()).filter((i) => i.status === 'pending')
    setGroupInviteBadgeCount(inboxInvites.value.length)
  } catch { /* keep the last list; badge hydration recovers */ }
}
const inviteCallback = {
  onReceived: () => { void loadInbox() },
  onUpdated: (payload: { invite: { id: string; status: string } }) => {
    const { id, status } = payload?.invite ?? {}
    if (!id) return
    if (status && status !== 'pending') removeInboxInvite(id)
    else void loadInbox()
  },
}

const avatarRoundClass = groupAvatarRoundClass()

// ─── State ───────────────────────────────────────────────────────────────
const searchInput = ref('')
const trimmedQuery = ref('')

const groupFeeds = useCursorFeeds<{ spotlight: CommunityGroupShell; search: CommunityGroupShell }>({
  stateKey: 'groups-index',
  stateMode: 'local',
  streams: {
    // Server-side excludeMine guarantees the spotlight only contains groups
    // the viewer can actually join — so the Discover surface is "never empty"
    // unless the system literally has no other groups.
    spotlight: {
      buildRequest: (cursor) => ({
        path: '/groups/explore',
        query: { limit: 24, ...(cursor ? { cursor } : {}), ...(isAuthed.value ? { excludeMine: '1' } : {}) },
      }),
      // Defensive dedup: the cursor branch may overlap with the tiered first page (featured/trending overlays).
      getItemId: (g) => g.id,
      clearOnError: true,
      defaultErrorMessage: 'Failed to load groups.',
      loadMoreErrorMessage: 'Failed to load more groups.',
    },
    // Search intentionally does NOT pass excludeMine — when the user is hunting a specific
    // group by name, hiding ones they're already in is confusing. Membership is shown on the row.
    search: {
      buildRequest: (cursor) => (trimmedQuery.value.length >= 2
        ? { path: '/groups/search', query: { q: trimmedQuery.value, limit: 20, ...(cursor ? { cursor } : {}) } }
        : null),
      defaultErrorMessage: 'Search failed.',
    },
  },
})
const {
  items: spotlight,
  nextCursor: spotlightNextCursor,
  loading: metaLoading,
  loadingMore: spotlightLoadingMore,
  error: metaError,
} = groupFeeds.spotlight
const { items: searchResults, nextCursor: searchNextCursor, error: searchError } = groupFeeds.search
const searchLoading = computed(() => groupFeeds.search.loading.value || groupFeeds.search.loadingMore.value)

const canCreateGroup = computed(() => {
  const u = user.value
  if (!u) return false
  return Boolean(u.premium || u.premiumPlus || u.siteAdmin)
})

const hasQuery = computed(() => trimmedQuery.value.length >= 2)

const spotlightCount = computed(() => discoverRows.value.length)

// What we render in the discover list.
//  - Spotlight (default): server-filtered with `excludeMine=1`, so the
//    viewer never sees groups they're already in here.
//  - Search results: NOT excluded — surfacing groups the viewer is in is
//    legitimate when they typed a name. Membership is indicated on the row.
const discoverRows = computed(() => (hasQuery.value ? searchResults.value : spotlight.value))

function initials(name: string) {
  const n = (name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

// Debounced reaction to typing. 250ms felt right in playtests; shorter and
// keystrokes thrash the API, longer and the UI feels laggy.
let debounceHandle: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (raw) => {
  if (debounceHandle) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(() => {
    debounceHandle = null
    const q = (raw ?? '').trim().slice(0, 80)
    trimmedQuery.value = q
    void groupFeeds.search.refresh({ reset: true })
  }, 250)
})

// ─── Pagination ──────────────────────────────────────────────────────────
// One sentinel handles both surfaces — whichever has a `nextCursor` and is
// not currently loading drives the next fetch. They are mutually exclusive
// because the result list either renders search rows OR spotlight rows.
const loadMoreSentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()
const canLoadMore = computed(() => {
  if (hasQuery.value) return Boolean(searchNextCursor.value) && !searchLoading.value
  return Boolean(spotlightNextCursor.value) && !spotlightLoadingMore.value && !metaLoading.value
})
const isPaginating = computed(() =>
  hasQuery.value ? searchLoading.value : spotlightLoadingMore.value,
)
const hasNextPage = computed(() =>
  hasQuery.value ? Boolean(searchNextCursor.value) : Boolean(spotlightNextCursor.value),
)
useLoadMoreObserver(
  loadMoreSentinelEl,
  middleScrollerRef,
  canLoadMore,
  () => {
    void (hasQuery.value ? groupFeeds.search.loadMore() : groupFeeds.spotlight.loadMore())
  },
)

watch(
  isAuthed,
  () => {
    void groupFeeds.spotlight.refresh()
  },
  { immediate: true },
)

onMounted(() => {
  addGroupInviteCallback(inviteCallback)
  if (isAuthed.value) { void clearLockScreen('groups'); void loadMyGroups(); void loadInbox() }
})
onActivated(() => {
  if (!isAuthed.value) return
  void clearLockScreen('groups')
  void loadMyGroups({ force: true }).catch(() => undefined)
  void loadInbox()
})
watch(isAuthed, signedIn => { if (signedIn) { void loadMyGroups(); void loadInbox() } else inboxInvites.value = [] })
onBeforeUnmount(() => {
  removeGroupInviteCallback(inviteCallback)
  if (debounceHandle) clearTimeout(debounceHandle)
})
const metaInitialLoading = useInitialLoading(metaLoading, () => discoverRows.value.length > 0, metaError)
</script>

