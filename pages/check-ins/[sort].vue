<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <!-- Daily check-in hero: full form, only shown when the user hasn't answered today yet.
           Lets the user complete their check-in without leaving the page. -->
      <AppFeedDailyCheckinHero
        v-if="showHero"
        :state="checkinState"
        :my-checkin-body="lastCheckinBody"
        :can-answer="canAnswerCheckin"
        :on-answer="openCheckinComposer"
        :on-login-to-answer="goToLoginForCheckin"
      />

      <div class="px-4 pt-4 pb-2">
        <AppPageHeader
          title="Check-ins"
          icon="tabler:calendar-check"
          description="Recent and trending daily check-ins."
        />
      </div>

      <div class="px-4 pb-2 flex items-center gap-2">
        <NuxtLink to="/check-ins/trending">
          <Button
            label="Trending"
            :severity="sort === 'trending' ? 'primary' : 'secondary'"
            rounded
            size="small"
          />
        </NuxtLink>
        <NuxtLink to="/check-ins/new">
          <Button
            label="New"
            :severity="sort === 'new' ? 'primary' : 'secondary'"
            rounded
            size="small"
          />
        </NuxtLink>
      </div>

      <div v-if="error" class="px-4 pb-3">
        <AppInlineAlert severity="danger">
          {{ error }}
        </AppInlineAlert>
      </div>

      <AppSubtleSectionLoader :loading="showInitialLoader" min-height-class="min-h-[220px]">
        <div v-if="posts.length === 0" class="px-4 py-6 text-sm moh-text-muted">
          No check-ins yet.
        </div>

        <div v-else class="space-y-0 transition-opacity duration-150">
          <TransitionGroup name="moh-post" tag="div" class="space-y-0">
            <AppFeedPostRow
              v-for="p in posts"
              :key="p.id"
              :post="p"
              @deleted="(id) => onDeleted(id)"
              @edited="onEdited"
            />
          </TransitionGroup>
        </div>

        <div class="px-4 py-6 flex justify-center">
          <Button
            v-if="nextCursor"
            label="Load more"
            severity="secondary"
            :loading="loadingMore"
            :disabled="loadingMore"
            @click="loadMore"
          />
        </div>
      </AppSubtleSectionLoader>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CheckinAllowedVisibility, FeedPost, PostVisibility } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'

const route = useRoute()

// Validate sort param — anything other than 'new' falls back to 'trending'
const sort = computed<'trending' | 'new'>(() =>
  route.params.sort === 'new' ? 'new' : 'trending'
)

// Redirect invalid slugs (e.g. /check-ins/foo) to canonical route
if (import.meta.server && sort.value !== route.params.sort) {
  await navigateTo('/check-ins/trending', { replace: true })
}

definePageMeta({
  layout: 'app',
  title: 'Check-ins',
  hideTopBar: true,
  ssr: false,
})

usePageSeo({
  title: computed(() => (sort.value === 'new' ? 'New Check-ins' : 'Trending Check-ins')),
  description: 'Recent and trending check-ins on Men of Hunger.',
  canonicalPath: computed(() => `/check-ins/${sort.value}`),
  noindex: true,
})

// ─── Feed ───────────────────────────────────────────────────────────────────

const { items: posts, nextCursor, loading, loadingMore, error, refresh, loadMore } = useCursorFeed<FeedPost>({
  stateKey: `check-ins-feed-${sort.value}`,
  buildRequest: (cursor) => ({
    path: '/posts',
    query: {
      limit: 30,
      cursor: cursor ?? undefined,
      sort: sort.value,
      kind: 'checkin',
      visibility: 'all',
      followingOnly: false,
    },
  }),
  getItemId: (p) => p.id,
  defaultErrorMessage: 'Failed to load check-ins.',
  loadMoreErrorMessage: 'Failed to load more check-ins.',
})
const showInitialLoader = computed(() => loading.value && posts.value.length === 0)

function onDeleted(id: string) {
  posts.value = posts.value.filter((p) => p.id !== id)
}

function onEdited(payload: { id: string; post: FeedPost }) {
  posts.value = posts.value.map((p) => (p.id === payload.id ? payload.post : p))
}

// ─── Daily check-in hero ─────────────────────────────────────────────────────

const { isAuthed } = useAuth()
const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)
const { state: checkinState, loading: checkinLoading, create: createCheckin, refresh: refreshCheckin } = useDailyCheckin()

const hasCheckedInToday = computed(() => Boolean(checkinState.value?.hasCheckedInToday))

const checkinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() =>
  (checkinState.value?.allowedVisibilities ?? []).filter(
    (v): v is CheckinAllowedVisibility => v === 'verifiedOnly' || v === 'premiumOnly',
  ),
)

const canAnswerCheckin = computed(() => checkinAllowedVisibilities.value.length > 0)

// Show the hero only for authed users who haven't answered yet and whose state has loaded.
const showHero = computed(() => {
  if (!isAuthed.value) return false
  if (checkinLoading.value && !checkinState.value) return false
  return checkinState.value !== null && !hasCheckedInToday.value
})

const lastCheckinBody = ref<string | null>(null)

async function createCheckinViaComposer(
  body: string,
  visibility: PostVisibility,
): Promise<{ id: string } | FeedPost | null> {
  const trimmed = body.trim()
  if (!trimmed) return null
  const vis: CheckinAllowedVisibility = visibility === 'premiumOnly' ? 'premiumOnly' : 'verifiedOnly'
  const res = await createCheckin({ body: trimmed, visibility: vis })
  lastCheckinBody.value = trimmed
  // Prepend the new post to the feed so the user sees it immediately.
  posts.value = [res.post, ...posts.value.filter((p) => p.id !== res.post.id)]
  return res.post
}

function openCheckinComposer() {
  if (!openComposer) return
  const allowed = checkinAllowedVisibilities.value
  if (!allowed.length) return
  const preferred: CheckinAllowedVisibility = allowed.includes('premiumOnly') ? 'premiumOnly' : 'verifiedOnly'
  openComposer({
    visibility: preferred,
    placeholder: checkinState.value?.prompt ? checkinState.value.prompt : 'Write a check-in…',
    allowedVisibilities: allowed,
    disableMedia: true,
    createPost: createCheckinViaComposer,
  })
}

function goToLoginForCheckin() {
  void navigateTo('/login')
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => {
  if (posts.value.length === 0 && !loading.value) void refresh()
  if (isAuthed.value && !checkinState.value && !checkinLoading.value) void refreshCheckin()
})

watch(sort, () => void refresh())
</script>
