<template>
  <div class="-mx-4">
    <AppInlineAlert v-if="errorText" class="mx-4 mt-4" severity="danger">
      {{ errorText }}
    </AppInlineAlert>

    <div v-else-if="post" class="-mx-0">
      <AppPostRow :post="post" :clickable="false" @deleted="onDeleted" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, GetPostResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { siteConfig } from '~/config/site'

definePageMeta({
  layout: 'app',
  title: 'Post'
})

const route = useRoute()
const postId = computed(() => String(route.params.id || '').trim())
const { apiFetchData } = useApiClient()

const post = ref<FeedPost | null>(null)
const errorText = ref<string | null>(null)
function onDeleted() {
  // Post is gone for this viewer; return to feed.
  post.value = null
  errorText.value = 'Post deleted.'
  void navigateTo('/home')
}

const { data, error } = await useAsyncData(`post:${postId.value}`, async () => {
  if (!postId.value) throw new Error('Post not found.')
  return await apiFetchData<GetPostResponse>(`/posts/${encodeURIComponent(postId.value)}`, { method: 'GET' })
})

post.value = data.value?.post ?? null
errorText.value = error.value ? (getApiErrorMessage(error.value) || 'Failed to load post.') : null

function normalizeForMeta(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function excerpt(text: string, maxLen: number) {
  const t = normalizeForMeta(text)
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`
}

const canonicalPath = computed(() => `/p/${encodeURIComponent(postId.value)}`)

const isRestricted = computed(() => {
  const v = post.value?.visibility
  return v === 'verifiedOnly' || v === 'premiumOnly' || v === 'onlyMe'
})

const restrictionLabel = computed(() => {
  const v = post.value?.visibility
  if (v === 'verifiedOnly') return 'Verified-only post'
  if (v === 'premiumOnly') return 'Premium-only post'
  if (v === 'onlyMe') return 'Private post'
  return 'Post'
})

const seoTitle = computed(() => {
  if (!post.value) return 'Post'
  if (isRestricted.value) return restrictionLabel.value

  const username = (post.value.author.username ?? '').trim()
  const body = (post.value.body ?? '').trim()
  const bodySnippet = body ? excerpt(body, 56) : 'Post'
  return username ? `${bodySnippet} — @${username}` : bodySnippet
})

const seoDescription = computed(() => {
  if (!post.value) return 'Post.'
  if (isRestricted.value) {
    if (post.value.visibility === 'verifiedOnly') return 'This post is visible to verified members only.'
    if (post.value.visibility === 'premiumOnly') return 'This post is visible to premium members only.'
    return 'This post is private.'
  }
  const body = (post.value.body ?? '').trim()
  return body ? excerpt(body, 190) : 'Post.'
})

const seoAuthor = computed(() => {
  if (!post.value || isRestricted.value) return siteConfig.name
  const username = (post.value.author.username ?? '').trim()
  return username ? `@${username}` : siteConfig.name
})

const jsonLdGraph = computed(() => {
  if (!post.value || isRestricted.value) return []

  const username = (post.value.author.username ?? '').trim()
  const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
  const authorId = authorUrl ? `${authorUrl}#person` : `${siteConfig.url}/#organization`
  const author: any = authorUrl
    ? { '@type': 'Person', '@id': authorId, name: username ? `@${username}` : siteConfig.name, url: authorUrl }
    : { '@type': 'Organization', '@id': `${siteConfig.url}/#organization`, name: siteConfig.name, url: siteConfig.url }

  return [
    authorUrl ? author : null,
    {
      '@type': 'Article',
      '@id': `${siteConfig.url}${canonicalPath.value}#article`,
      mainEntityOfPage: { '@id': `${siteConfig.url}${canonicalPath.value}#webpage` },
      headline: excerpt(post.value.body || 'Post', 90),
      description: seoDescription.value,
      datePublished: post.value.createdAt,
      dateModified: post.value.createdAt,
      author: { '@id': authorId },
      publisher: { '@id': `${siteConfig.url}/#organization` },
      isAccessibleForFree: true,
    }
  ].filter(Boolean)
})

usePageSeo({
  title: seoTitle,
  description: seoDescription,
  canonicalPath,
  ogType: computed(() => (isRestricted.value ? 'website' : 'article')),
  image: computed(() => (isRestricted.value ? '/images/logo-black-bg.png' : '/images/banner.png')),
  noindex: computed(() => (post.value ? isRestricted.value : false)),
  author: seoAuthor,
  jsonLdGraph
})
</script>

