<template>
  <div class="py-4 space-y-4">
    <AppAdminUserSubpageHeader
      title="User Articles"
      icon="tabler:article"
      description="Paginated admin view of authored articles."
      :username="username"
    />

    <div v-if="initialLoading" class="px-4 py-16 flex justify-center">
      <AppLogoLoader :size="48" />
    </div>

    <template v-else>
      <div v-if="error" class="px-4">
        <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
      </div>

      <div class="px-0">
        <div v-if="items.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No articles found.</div>
        <AppArticleListCard v-for="a in articleRows" :key="a.id" :article="a" />
      </div>

      <div v-if="nextCursor" class="px-4">
        <Button label="Load more" severity="secondary" :loading="loadingMore" :disabled="loadingMore" @click="loadMore" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AdminUserDetailData, AdminUserRecentArticle, Article, PostVisibility } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'User Articles',
  middleware: 'admin',
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const username = computed(() => String(route.params.username ?? '').trim())
const profile = ref<AdminUserDetailData | null>(null)
const profileError = ref<string | null>(null)
const feed = useCursorFeed<AdminUserRecentArticle>({
  stateKey: 'admin-user-articles',
  stateMode: 'local',
  buildRequest: (cursor) => username.value
    ? { path: `/admin/users/by-username/${encodeURIComponent(username.value)}/recent/articles`, query: { limit: 25, cursor: cursor ?? undefined } }
    : null,
  defaultErrorMessage: 'Failed to load articles.',
  loadMoreErrorMessage: 'Failed to load more articles.',
})
const { items, nextCursor, loadingMore, loadMore } = feed
const error = computed(() => profileError.value ?? feed.error.value)

function toArticleRow(item: AdminUserRecentArticle): Article {
  const author = profile.value
  const visibility = item.visibility as PostVisibility
  return {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
    publishedAt: item.publishedAt,
    editedAt: null,
    deletedAt: null,
    title: item.title,
    slug: item.slug,
    body: '',
    excerpt: item.excerpt,
    thumbnailUrl: null,
    visibility,
    isDraft: item.isDraft,
    lastSavedAt: item.createdAt,
    boostCount: item.boostCount,
    commentCount: item.commentCount,
    viewCount: item.viewCount,
    totalViewCount: item.totalViewCount ?? item.viewCount,
    author: {
      id: author?.id ?? '',
      username: author?.username ?? (username.value || null),
      name: author?.name ?? null,
      bio: author?.bio ?? null,
      articleBio: author?.bio ?? null,
      avatarUrl: author?.avatarUrl ?? null, avatarVideo: author?.avatarVideo ?? null,
      premium: Boolean(author?.premium),
      premiumPlus: Boolean(author?.premiumPlus),
      isOrganization: Boolean(author?.isOrganization),
      verifiedStatus: author?.verifiedStatus ?? 'none',
      orgAffiliations: author?.orgAffiliations ?? [],
    },
    reactions: [],
    tags: [],
    viewerCanAccess: true,
  }
}

// Rows wait for the author profile so cards never render with a blank byline.
const articleRows = computed(() => (profile.value ? items.value.map(toArticleRow) : []))
const initialLoading = computed(() => feed.initialLoading.value || (!profile.value && !error.value && Boolean(username.value)))

async function loadProfile() {
  profileError.value = null
  try {
    profile.value = await apiFetchData<AdminUserDetailData>(`/admin/users/by-username/${encodeURIComponent(username.value)}`)
  } catch (e: unknown) {
    profileError.value = getApiErrorMessage(e) || 'Failed to load articles.'
  }
}

watch(() => username.value, (name) => {
  if (!name) return
  void Promise.all([loadProfile(), feed.refresh()])
}, { immediate: true })
</script>
