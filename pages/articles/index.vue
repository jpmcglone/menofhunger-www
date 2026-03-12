<template>
  <AppPageContent bottom="standard">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 pt-4 pb-3">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Articles</h1>
      <NuxtLink
        v-if="isPremium"
        to="/articles/new"
        class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        :style="{ backgroundColor: activeTabColor }"
      >
        <Icon name="tabler:pencil" class="text-[14px]" aria-hidden="true" />
        Write
      </NuxtLink>
    </div>

    <!-- Scope + Filter bar -->
    <div class="flex items-center justify-between gap-2 px-4 pb-3 border-b border-gray-200 dark:border-zinc-800">
      <!-- All / Following scope toggle — always rendered when authed, fades out on drafts tab -->
      <ClientOnly>
        <div
          v-if="isAuthed"
          class="transition-opacity duration-200"
          :class="activeTab === 'drafts' ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          :aria-hidden="activeTab === 'drafts'"
        >
          <AppTabSelector
            :model-value="scope"
            aria-label="Article scope"
            :tabs="scopeTabs"
            @update:model-value="scope = $event as 'all' | 'following'"
          />
        </div>
        <div v-else class="flex-1" />
        <template #fallback><div class="flex-1" /></template>
      </ClientOnly>

      <AppFeedFiltersBar
        :sort="sort"
        :filter="visibilityFilter"
        :viewer-is-verified="isVerified"
        :viewer-is-premium="isPremium"
        :show-reset="activeTab === 'drafts' ? visibilityFilter !== 'all' : sort !== 'new' || visibilityFilter !== 'all'"
        :hide-sort="activeTab === 'drafts'"
        @update:sort="sort = $event"
        @update:filter="onArticlesFilterChange"
        @reset="resetFilters"
      />
    </div>

    <!-- Content tabs (Published | Drafts) for premium users -->
    <div v-if="isPremium" ref="tabBarEl" role="tablist" class="relative flex gap-0 border-b border-gray-200 dark:border-zinc-800">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :ref="(el) => setTabButtonRef(tab.key, el as HTMLElement | null)"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        class="relative cursor-pointer px-5 py-3 text-sm font-semibold transition-colors"
        :class="activeTab === tab.key
          ? 'text-gray-900 dark:text-gray-100'
          : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'"
        @click="setTab(tab.key)"
      >
        {{ tab.label }}
        <span
          v-if="tab.count != null"
          class="ml-1.5 text-xs font-medium"
          :class="activeTab === tab.key ? 'text-gray-400 dark:text-zinc-400' : 'text-gray-300 dark:text-zinc-600'"
        >{{ tab.count }}</span>
      </button>
      <!-- Animated sliding underline -->
      <span
        class="absolute bottom-0 h-[2px] rounded-full"
        :class="underlineReady ? 'transition-[left,width] duration-250 ease-in-out' : ''"
        :style="{ left: `${underlineLeft}px`, width: `${underlineWidth}px`, backgroundColor: activeTabColor }"
        aria-hidden="true"
      />
    </div>

    <!-- Published articles feed -->
    <div v-if="tabActivated.published" v-show="activeTab === 'published'" role="tabpanel">
      <div v-if="(publishedFeed.loading.value || !publishedFeed.hasLoadedOnce.value) && publishedFeed.articles.value.length === 0" class="flex items-center justify-center py-16">
        <AppLogoLoader />
      </div>
      <div v-else-if="publishedFeed.error.value" class="py-8 text-center text-sm text-red-500">
        {{ publishedFeed.error.value }}
      </div>
      <div v-else>
        <TransitionGroup name="articles-list" tag="div">
          <AppArticleListCard
            v-for="article in publishedFeed.articles.value"
            :key="article.id"
            :article="article"
          />
        </TransitionGroup>
        <button
          v-if="publishedFeed.nextCursor.value"
          type="button"
          class="w-full border-t border-gray-200 dark:border-zinc-800 py-3 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
          :disabled="publishedFeed.loadingMore.value"
          @click="publishedFeed.loadMore()"
        >
          {{ publishedFeed.loadingMore.value ? 'Loading…' : 'Load more' }}
        </button>
        <p v-if="publishedFeed.hasLoadedOnce.value && publishedFeed.articles.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
          No articles found.
          <template v-if="isPremium">
            <NuxtLink to="/articles/new" class="hover:underline" :style="{ color: activeTabColor }">Write the first one!</NuxtLink>
          </template>
        </p>
      </div>
    </div>

    <!-- Drafts -->
    <div v-if="tabActivated.drafts" v-show="activeTab === 'drafts'" role="tabpanel">
      <div v-if="draftsState.loading.value && !draftsState.hasLoadedOnce.value">
        <div class="flex items-center justify-center py-16">
          <AppLogoLoader />
        </div>
      </div>
      <div v-else-if="draftsState.error.value" class="py-8 text-center text-sm text-red-500">
        {{ draftsState.error.value }}
      </div>
      <div v-else>
        <TransitionGroup name="articles-list" tag="div">
          <AppArticleListCard
            v-for="draft in draftsState.drafts.value"
            :key="draft.id"
            :article="draft"
            @delete="confirmDelete"
          />
        </TransitionGroup>
        <p v-if="draftsState.hasLoadedOnce.value && draftsState.drafts.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
          No drafts found.
          <NuxtLink to="/articles/new" class="hover:underline" :style="{ color: activeTabColor }">Start writing!</NuxtLink>
        </p>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'

definePageMeta({ layout: 'app', title: 'Articles', hideTopBar: true })

useHead({ title: 'Articles' })
useSeoMeta({
  description: 'Read and discover articles on Men of Hunger.',
  ogTitle: 'Articles — Men of Hunger',
  ogDescription: 'Read and discover articles on Men of Hunger.',
})

const { isPremium, isVerified, isAuthed, user } = useAuth()

const activeTabColor = computed(() => {
  const tier = userColorTier(user.value)
  return userTierColorVar(tier) ?? '#e4e4e7'
})

// ─── All filters (sort, visibility, scope) — synced to URL query params ──────

const {
  filter: visibilityFilter,
  sort,
  scope,
  isFiltered,
  resetFilters,
} = useUrlFeedFilters()

const scopeTabs = [
  { key: 'all', label: 'All', disabled: false },
  { key: 'following', label: 'Following', disabled: false },
]

const followingOnly = computed(() => isAuthed.value && scope.value === 'following')

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'published' | 'drafts'
const route = useRoute()
const router = useRouter()

function tabFromQuery(): TabKey {
  return route.query.tab === 'drafts' && isPremium.value ? 'drafts' : 'published'
}

const activeTab = computed<TabKey>(() => tabFromQuery())
const tabActivated = reactive<Record<TabKey, boolean>>({
  published: true,
  drafts: tabFromQuery() === 'drafts',
})

const tabs = computed<Array<{ key: TabKey; label: string; count?: number }>>(() => {
  const t: Array<{ key: TabKey; label: string; count?: number }> = [
    {
      key: 'published',
      label: 'Published',
      count: publishedFeed.articles.value.length || undefined,
    },
  ]
  if (isPremium.value) {
    t.push({
      key: 'drafts',
      label: 'Drafts',
      count: draftsState.drafts.value.length || undefined,
    })
  }
  return t
})

// ─── Animated tab underline ───────────────────────────────────────────────────

const tabBarEl = ref<HTMLElement | null>(null)
const tabButtonEls = new Map<TabKey, HTMLElement>()
const underlineLeft = ref(0)
const underlineWidth = ref(0)
const underlineReady = ref(false)
const underlineMounted = ref(false)

function setTabButtonRef(key: TabKey, el: HTMLElement | null) {
  if (el) tabButtonEls.set(key, el)
  else tabButtonEls.delete(key)
}

function updateUnderline(animate = true) {
  if (!import.meta.client) return
  const bar = tabBarEl.value
  const btn = tabButtonEls.get(activeTab.value)
  if (!bar || !btn) return
  const barRect = bar.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  underlineLeft.value = Math.round(btnRect.left - barRect.left)
  underlineWidth.value = Math.round(btnRect.width)
  if (animate) underlineReady.value = true
}

function setTab(key: TabKey) {
  const query = { ...route.query, tab: key === 'drafts' ? 'drafts' : undefined }
  void router.replace({ path: route.path, query })
}

// ─── Feeds ────────────────────────────────────────────────────────────────────

const publishedFeed = useArticleFeed({
  sort,
  visibility: visibilityFilter,
  followingOnly,
  includeRestricted: true,
})
const draftsState = useArticleDrafts({ visibility: visibilityFilter, enabled: isPremium })

onMounted(() => {
  publishedFeed.load()
  if (isPremium.value) draftsState.load()
})

watch(activeTab, (tab) => {
  if (!tabActivated[tab]) tabActivated[tab] = true
  nextTick(() => updateUnderline(underlineMounted.value))
  if (tab === 'drafts' && draftsState.drafts.value.length === 0 && !draftsState.loading.value) {
    void draftsState.load()
  }
}, { immediate: true })

watch(isPremium, (premium) => {
  if (premium) return
  if (route.query.tab === 'drafts') {
    void router.replace({ path: route.path, query: { ...route.query, tab: undefined } })
  }
})

onMounted(() => nextTick(() => {
  updateUnderline(false)
  // Only animate after the initial underline position is measured and painted.
  underlineMounted.value = true
}))

async function confirmDelete(id: string) {
  if (!confirm('Delete this draft? This cannot be undone.')) return
  await draftsState.deleteDraft(id)
}

function onArticlesFilterChange(next: ProfilePostsFilter) {
  // Articles feed visibility does not support onlyMe.
  visibilityFilter.value = next === 'onlyMe' ? 'all' : next
}
</script>

<style scoped>
.articles-list-enter-active,
.articles-list-leave-active {
  transition: opacity 0.2s ease;
}

.articles-list-enter-from,
.articles-list-leave-to {
  opacity: 0;
}

.articles-list-move {
  transition: transform 0.25s ease;
}
</style>
