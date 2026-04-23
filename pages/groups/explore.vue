<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <!-- Header band: edge-to-edge with gutter padding, divided by border-b. -->
      <div class="moh-gutter-x border-b moh-border pb-4 pt-4 space-y-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-start gap-2 min-w-0">
            <NuxtLink
              to="/groups"
              class="moh-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full moh-surface-hover"
              aria-label="Back to groups feed"
            >
              <Icon name="tabler:chevron-left" class="text-lg" aria-hidden="true" />
            </NuxtLink>
            <div class="min-w-0">
              <h1 class="moh-h1">Explore groups</h1>
              <p class="mt-1 moh-meta max-w-xl">
                Find communities to join — public ones are open, private ones need approval.
              </p>
            </div>
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

      <!-- Discover section -->
      <section class="pt-5" aria-labelledby="explore-discover-heading">
        <div class="moh-gutter-x space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="explore-discover-heading" class="text-sm font-semibold uppercase tracking-wide moh-text-muted">
              {{ hasQuery ? 'Search results' : 'Discover' }}
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
              :placeholder="isAuthed ? 'Search groups by name…' : 'Search public groups by name…'"
              autocomplete="off"
              aria-label="Search groups"
            />
          </IconField>
        </div>

        <AppInlineAlert v-if="searchError" class="moh-gutter-x mt-3" severity="danger">
          {{ searchError }}
        </AppInlineAlert>

        <!-- Initial spotlight loading -->
        <div v-if="metaLoading" class="flex justify-center py-10">
          <AppLogoLoader />
        </div>

        <!-- Empty state: search returned nothing -->
        <div
          v-else-if="hasQuery && !searchLoading && searchResults.length === 0"
          class="moh-gutter-x py-10 text-center text-sm moh-text-muted"
        >
          No groups match “{{ trimmedQuery }}”.
        </div>

        <!-- Empty state: server returned nothing (only happens when the
             viewer is genuinely a member of every group, or there are none). -->
        <div
          v-else-if="!hasQuery && discoverRows.length === 0"
          class="moh-gutter-x py-10 text-center text-sm moh-text-muted"
        >
          {{ isAuthed ? 'You’re in every group we have right now. Nice.' : 'No groups yet — check back soon.' }}
        </div>

        <!-- Result list — full-bleed divided rows. NO outer card wrapper. -->
        <div
          v-else
          class="mt-3 divide-y divide-gray-100 dark:divide-white/5"
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
                  Private
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
import type { CommunityGroupShell, ApiEnvelope } from '~/types/api'
import { groupAvatarRoundClass } from '~/utils/avatar-rounding'
import { getApiErrorMessage } from '~/utils/api-error'
import { useLoadMoreObserver } from '~/composables/useLoadMoreObserver'
import { useMiddleScroller } from '~/composables/useMiddleScroller'

definePageMeta({
  layout: 'app',
  title: 'Explore groups',
  hideTopBar: true,
})

usePageSeo({
  title: 'Explore groups',
  description: 'Discover community groups to join on Men of Hunger.',
  canonicalPath: '/groups/explore',
  noindex: true,
})

const { apiFetch } = useApiClient()
const { user, isAuthed } = useAuth()

const avatarRoundClass = groupAvatarRoundClass()

// ─── State ───────────────────────────────────────────────────────────────
const metaLoading = ref(true)
const metaError = ref<string | null>(null)
const spotlight = ref<CommunityGroupShell[]>([])
const spotlightNextCursor = ref<string | null>(null)
const spotlightLoadingMore = ref(false)
let spotlightToken = 0

const searchInput = ref('')
const trimmedQuery = ref('')
const searchResults = ref<CommunityGroupShell[]>([])
const searchNextCursor = ref<string | null>(null)
const searchLoading = ref(false)
const searchError = ref<string | null>(null)
let searchToken = 0

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

// ─── Loading ─────────────────────────────────────────────────────────────
async function loadMeta() {
  metaLoading.value = true
  metaError.value = null
  spotlightToken += 1
  const token = spotlightToken
  try {
    // Server-side excludeMine guarantees the spotlight only contains groups
    // the viewer can actually join — so the Discover surface is "never empty"
    // unless the system literally has no other groups.
    const params = new URLSearchParams({ limit: '24' })
    if (isAuthed.value) params.set('excludeMine', '1')
    const res = await apiFetch<CommunityGroupShell[]>(`/groups/explore?${params.toString()}`) as ApiEnvelope<CommunityGroupShell[]>
    if (token !== spotlightToken) return
    spotlight.value = Array.isArray(res.data) ? res.data : []
    spotlightNextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    if (token !== spotlightToken) return
    metaError.value = getApiErrorMessage(e) || 'Failed to load groups.'
    spotlight.value = []
    spotlightNextCursor.value = null
  } finally {
    if (token === spotlightToken) metaLoading.value = false
  }
}

async function loadMoreSpotlight() {
  const cursor = spotlightNextCursor.value
  if (!cursor || spotlightLoadingMore.value) return
  spotlightLoadingMore.value = true
  const token = spotlightToken
  try {
    const params = new URLSearchParams({ limit: '24', cursor })
    if (isAuthed.value) params.set('excludeMine', '1')
    const res = await apiFetch<CommunityGroupShell[]>(`/groups/explore?${params.toString()}`) as ApiEnvelope<CommunityGroupShell[]>
    if (token !== spotlightToken) return
    const rows = Array.isArray(res.data) ? res.data : []
    // Defensive client-side dedup: the cursor branch may overlap with the
    // tiered first page in rare cases (featured/trending overlays).
    const seen = new Set(spotlight.value.map((g) => g.id))
    const fresh = rows.filter((g) => !seen.has(g.id))
    spotlight.value = [...spotlight.value, ...fresh]
    spotlightNextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    if (token !== spotlightToken) return
    metaError.value = getApiErrorMessage(e) || 'Failed to load more groups.'
  } finally {
    if (token === spotlightToken) spotlightLoadingMore.value = false
  }
}

async function runSearch(q: string, opts: { append?: boolean; cursor?: string | null } = {}) {
  const token = ++searchToken
  if (!opts.append) {
    searchResults.value = []
    searchNextCursor.value = null
    searchError.value = null
  }
  if (q.length < 2) {
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  try {
    // NOTE: search intentionally does NOT pass excludeMine — when the user
    // is hunting a specific group by name, hiding ones they're already in
    // is confusing ("why doesn't my group appear?"). Membership is indicated
    // on the row instead.
    const params = new URLSearchParams({ q, limit: '20' })
    if (opts.cursor) params.set('cursor', opts.cursor)
    const res = await apiFetch<CommunityGroupShell[]>(`/groups/search?${params.toString()}`) as ApiEnvelope<CommunityGroupShell[]>
    if (token !== searchToken) return
    const rows = Array.isArray(res.data) ? res.data : []
    searchResults.value = opts.append ? [...searchResults.value, ...rows] : rows
    searchNextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    if (token !== searchToken) return
    searchError.value = getApiErrorMessage(e) || 'Search failed.'
  } finally {
    if (token === searchToken) searchLoading.value = false
  }
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
    void runSearch(q)
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
    if (hasQuery.value) {
      void runSearch(trimmedQuery.value, { append: true, cursor: searchNextCursor.value })
    } else {
      void loadMoreSpotlight()
    }
  },
)

watch(
  isAuthed,
  () => {
    void loadMeta()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (debounceHandle) clearTimeout(debounceHandle)
  searchToken += 1 // invalidate any inflight requests
})
</script>

