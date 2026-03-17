<template>
  <div class="py-4 space-y-4">
    <AppAdminUserSubpageHeader
      title="User Articles"
      icon="tabler:article"
      description="Paginated admin view of authored articles."
      :username="username"
    />

    <div v-if="loading" class="px-4 py-16 flex justify-center">
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
const { apiFetch, apiFetchData } = useApiClient()
const username = computed(() => String(route.params.username ?? '').trim())
const items = ref<AdminUserRecentArticle[]>([])
const profile = ref<AdminUserDetailData | null>(null)
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

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
    author: {
      id: author?.id ?? '',
      username: author?.username ?? (username.value || null),
      name: author?.name ?? null,
      bio: author?.bio ?? null,
      articleBio: author?.bio ?? null,
      avatarUrl: author?.avatarUrl ?? null,
      premium: Boolean(author?.premium),
      premiumPlus: Boolean(author?.premiumPlus),
      isOrganization: Boolean(author?.isOrganization),
      stewardBadgeEnabled: author?.stewardBadgeEnabled ?? true,
      verifiedStatus: author?.verifiedStatus ?? 'none',
      orgAffiliations: author?.orgAffiliations ?? [],
    },
    reactions: [],
    tags: [],
    viewerCanAccess: true,
  }
}

const articleRows = computed(() => items.value.map(toArticleRow))

async function fetchPage(cursor?: string) {
  const res = await apiFetch<AdminUserRecentArticle[]>(
    `/admin/users/by-username/${encodeURIComponent(username.value)}/recent/articles`,
    { query: { limit: 25, cursor } },
  )
  return { data: res.data ?? [], next: res.pagination?.nextCursor ?? null }
}

async function loadInitial() {
  if (!username.value) return
  loading.value = true
  error.value = null
  try {
    const [page, detail] = await Promise.all([
      fetchPage(),
      apiFetchData<AdminUserDetailData>(`/admin/users/by-username/${encodeURIComponent(username.value)}`),
    ])
    profile.value = detail
    items.value = page.data
    nextCursor.value = page.next
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load articles.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await fetchPage(nextCursor.value)
    items.value = [...items.value, ...page.data]
    nextCursor.value = page.next
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load more articles.'
  } finally {
    loadingMore.value = false
  }
}

watch(() => username.value, () => void loadInitial(), { immediate: true })
</script>
