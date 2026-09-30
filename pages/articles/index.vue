<template>
  <AppPageContent bottom="standard">
    <!-- Same header as iOS: title, then icon actions. Sort, audience, and the RSS link live in the Filter menu. -->
    <div class="flex items-center justify-between moh-gutter-x pt-3 pb-1">
      <h1 class="moh-h1">Articles</h1>
      <div class="flex items-center">
        <AppFeedFiltersBar
          icon-only
          :sort="sort"
          :filter="visibilityFilter"
          :viewer-is-verified="isVerified"
          :viewer-is-premium="isPremium"
          :hide-sort="activeTab === 'drafts'"
          feed-label="Copy RSS feed link"
          @update:sort="onArticlesSortChange"
          @update:filter="onArticlesFilterChange"
          @copy-feed="copyArticlesRss"
        />
        <NuxtLink
          v-if="isVerifiedMember"
          v-tooltip.bottom="'Write an article'"
          to="/articles/new"
          class="moh-tap moh-focus inline-flex size-11 items-center justify-center rounded-full moh-text-muted hover:text-[var(--moh-text)] moh-surface-hover transition-colors"
          aria-label="Write an article"
        >
          <AppIconGlyph name="write" :size="20" />
        </NuxtLink>
      </div>
    </div>

    <div class="border-b moh-border">
      <!-- All / Following scope — rendered when authed, fades out on drafts tab -->
      <ClientOnly>
        <div
          v-if="isAuthed"
          class="moh-gutter-x pb-3 pt-1 transition-opacity duration-200"
          :class="activeTab === 'drafts' ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          :aria-hidden="activeTab === 'drafts'"
        >
          <AppTabSelector
            :model-value="scope"
            aria-label="Article scope"
            :tabs="scopeTabs"
            @update:model-value="onArticlesScopeChange($event as 'all' | 'following')"
          />
        </div>
      </ClientOnly>

      <!-- Chips appear only while a filter is on; each one clears itself. -->
      <div v-if="showsFilterChips" class="flex flex-wrap items-center gap-2 moh-gutter-x pb-2.5" :class="{ 'pt-2': !isAuthed }">
        <AppFilterChip v-if="activeTab !== 'drafts' && sort === 'trending'" label="Trending" @clear="onArticlesSortChange('new')" />
        <AppFilterChip
          v-if="visibilityFilter !== 'all'"
          :label="visibilityChipLabel"
          :tone="visibilityFilter === 'premiumOnly' ? '--moh-premium' : '--moh-verified'"
          @clear="onArticlesFilterChange('all')"
        />
        <AppFilterChip v-if="activeTag" :label="`#${activeTag}`" @clear="clearTagFilter" />
      </div>
    </div>

    <!-- Content tabs (Published | Drafts) for verified+ users -->
    <div v-if="isVerifiedMember" ref="tabBarEl" role="tablist" class="sticky top-[var(--moh-title-bar-height,0px)] z-10 moh-surface flex gap-0 border-b moh-border">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :ref="(el) => setTabButtonRef(tab.key, el as HTMLElement | null)"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        class="relative cursor-pointer px-5 py-3 text-sm font-semibold transition-colors"
        :class="activeTab === tab.key
          ? 'text-[var(--moh-text)]'
          : 'moh-text-soft hover:text-[var(--moh-text-muted)]'"
        @click="onArticlesTabChange(tab.key)"
      >
        {{ tab.label }}
        <span
          v-if="tab.count != null"
          class="ml-1.5 text-xs font-medium"
          :class="activeTab === tab.key ? 'moh-text-muted' : 'moh-text-soft'"
        >{{ tab.count }}</span>
      </button>
      <!-- Animated sliding underline -->
      <span
        class="absolute bottom-0 h-[2px] rounded-full"
        :style="{
          left: `${underlineLeft}px`,
          width: `${underlineWidth}px`,
          backgroundColor: activeTabColor,
          transition: underlineReady ? 'left 220ms ease-in-out, width 220ms ease-in-out' : 'none',
        }"
        aria-hidden="true"
      />
    </div>
    <div ref="articlesFeedContentEl" class="h-0 overflow-hidden" aria-hidden="true" />

    <!-- Published articles feed -->
    <div v-if="tabActivated.published" v-show="activeTab === 'published'" role="tabpanel">
      <AppArticlesActivity v-if="isAuthed" />
      <AppSubtleSectionLoader :loading="publishedInitialLoading" :refreshing="publishedFeed.loading.value && !publishedInitialLoading" min-height-class="min-h-[220px]">
        <AppScreenState
          v-if="publishedFeed.error.value" title="Couldn’t load articles" icon="warning" error
          :description="publishedFeed.error.value" action-label="Try again" :busy="publishedFeed.loading.value" @action="publishedFeed.load({ force: true })" />
        <div v-else>
          <TransitionGroup name="articles-list" tag="div" class="moh-divide">
            <AppArticleListCard
              v-for="article in publishedFeed.articles.value"
              :key="article.id"
              :article="article"
            />
          </TransitionGroup>
          <button
            v-if="publishedFeed.nextCursor.value"
            type="button"
            class="w-full border-t moh-border py-3 text-sm moh-text-muted transition-colors hover:bg-[var(--moh-surface-hover)]"
            :disabled="publishedFeed.loadingMore.value"
            @click="publishedFeed.loadMore()"
          >
            {{ publishedFeed.loadingMore.value ? 'Loading…' : 'Load more' }}
          </button>
          <AppScreenState
            v-if="publishedFeed.hasLoadedOnce.value && publishedFeed.articles.value.length === 0"
            title="No articles yet" icon="article" description="New articles will appear here."
            :action-label="isVerifiedMember ? 'Write an article' : undefined" action-to="/articles/new" />
        </div>
      </AppSubtleSectionLoader>
    </div>

    <!-- Drafts -->
    <div v-if="tabActivated.drafts" v-show="activeTab === 'drafts'" role="tabpanel">
      <AppSubtleSectionLoader :loading="draftsInitialLoading" :refreshing="draftsState.loading.value && !draftsInitialLoading" min-height-class="min-h-[220px]">
        <AppScreenState
          v-if="draftsState.error.value" title="Couldn’t load articles" icon="warning" error
          :description="draftsState.error.value" action-label="Try again" :busy="draftsState.loading.value" @action="draftsState.load()" />
        <div v-else>
          <TransitionGroup name="articles-list" tag="div" class="moh-divide">
            <AppArticleListCard
              v-for="draft in draftsState.drafts.value"
              :key="draft.id"
              :article="draft"
              @delete="confirmDelete"
            />
          </TransitionGroup>
          <AppScreenState
            v-if="draftsState.hasLoadedOnce.value && draftsState.drafts.value.length === 0"
            title="No drafts yet" icon="write" description="Start an article and come back to it whenever you’re ready."
            action-label="Start writing" action-to="/articles/new" />
        </div>
      </AppSubtleSectionLoader>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

definePageMeta({ layout: 'app', title: 'Articles', hideTopBar: true })

usePageSeo({
  title: 'Articles',
  description: 'Read and discover articles on Men of Hunger — longform writing on discipline, ambition, growth, and community.',
  jsonLdGraph: computed(() => [
    {
      '@type': 'CollectionPage',
      '@id': 'https://menofhunger.com/articles#webpage',
      url: 'https://menofhunger.com/articles',
      name: 'Articles — Men of Hunger',
      description: 'Longform articles on discipline, ambition, personal growth, and community from the Men of Hunger community.',
      isPartOf: { '@id': 'https://menofhunger.com/#website' },
      inLanguage: 'en-US',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Men of Hunger', item: 'https://menofhunger.com' },
        { '@type': 'ListItem', position: 2, name: 'Articles', item: 'https://menofhunger.com/articles' },
      ],
    },
  ]),
})

const { isPremium, isVerified, isVerifiedMember, isAuthed, user } = useAuth()

const { copyText: copyTextRaw } = useCopyToClipboard()
const articlesToast = useAppToast()
const { origin: siteOrigin } = useRequestURL()

async function copyArticlesRss() {
  try {
    await copyTextRaw(`${siteOrigin}/articles/feed.xml`)
    articlesToast.push({ title: 'RSS feed link copied', tone: 'success', durationMs: 1400 })
  } catch {
    articlesToast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
  }
}

const activeTabColor = computed(() => {
  const tier = userColorTier(user.value)
  return userTierColorVar(tier) ?? '#e4e4e7'
})

// ─── All filters (sort, visibility, scope) — synced to URL query params ──────

const {
  filter: visibilityFilter,
  sort,
  scope,
} = useUrlFeedFilters()

const scopeTabs = [
  { key: 'all', label: 'All', disabled: false },
  { key: 'following', label: 'Following', disabled: false },
]

const followingOnly = computed(() => isAuthed.value && scope.value === 'following')

// Tag filter — read from ?tag= query param.
const activeTag = computed<string | null>(() => {
  const t = route.query.tag
  return typeof t === 'string' && t.trim() ? t.trim() : null
})

const visibilityChipLabel = computed(() => {
  if (visibilityFilter.value === 'public') return 'Public'
  if (visibilityFilter.value === 'premiumOnly') return 'Premium only'
  return 'Verified only'
})

const showsFilterChips = computed(() =>
  (activeTab.value !== 'drafts' && sort.value === 'trending')
  || visibilityFilter.value !== 'all'
  || Boolean(activeTag.value),
)

function clearTagFilter() {
  const { tag: _tag, ...rest } = route.query
  void router.replace({ path: route.path, query: rest })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'published' | 'drafts'
const route = useRoute()
const router = useRouter()

function tabFromQuery(): TabKey {
  return route.query.tab === 'drafts' && isVerifiedMember.value ? 'drafts' : 'published'
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
  if (isVerifiedMember.value) {
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
  tag: activeTag,
  includeRestricted: isAuthed,
})
const draftsState = useArticleDrafts({ visibility: visibilityFilter, enabled: isVerifiedMember })
const publishedInitialLoading = computed(
  () => (!publishedFeed.hasLoadedOnce.value && !publishedFeed.error.value) && publishedFeed.articles.value.length === 0,
)
const draftsInitialLoading = computed(
  () => !draftsState.hasLoadedOnce.value && !draftsState.error.value && draftsState.drafts.value.length === 0,
)

onMounted(() => {
  if (activeTag.value) {
    void navigateTo(`/topics/${encodeURIComponent(activeTag.value)}`, { replace: true })
    return
  }
  publishedFeed.load()
  if (isVerifiedMember.value) draftsState.load()
})

watch(activeTab, (tab) => {
  if (!tabActivated[tab]) tabActivated[tab] = true
  nextTick(() => updateUnderline(underlineMounted.value))
  if (tab === 'drafts' && draftsState.drafts.value.length === 0 && !draftsState.loading.value) {
    void draftsState.load()
  }
}, { immediate: true })

watch(isVerifiedMember, (member) => {
  if (member) return
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

const articlesFeedContentEl = ref<HTMLElement | null>(null)
const { scrollToTop: scrollFeedToTop } = useFeedScrollToTop(articlesFeedContentEl, tabBarEl)

function onArticlesScopeChange(next: 'all' | 'following') {
  scope.value = next
  scrollFeedToTop()
}

function onArticlesSortChange(next: 'new' | 'trending') {
  sort.value = next
  scrollFeedToTop()
}

function onArticlesFilterChange(next: ProfilePostsFilter) {
  // Articles feed visibility does not support onlyMe.
  visibilityFilter.value = next === 'onlyMe' ? 'all' : next
  scrollFeedToTop()
}

function onArticlesTabChange(key: TabKey) {
  setTab(key)
  scrollFeedToTop()
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
