<template>
  <div class="-mx-4">
    <div v-if="errorText" class="mx-4 mt-4">
      <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {{ errorTitle }}
        </div>
        <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
          {{ errorBody }}
        </div>

        <div v-if="showLoginCta" class="mt-4 flex flex-wrap items-center gap-2">
          <Button
            label="Log in"
            icon="pi pi-sign-in"
            rounded
            @click="goToLogin"
          />
          <div class="text-xs text-gray-500 dark:text-gray-400">
            You’ll be returned here after logging in.
          </div>
        </div>
      </div>
    </div>

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

const { user, ensureLoaded } = useAuth()
// Ensure SSR/initial loads know whether viewer is logged in.
await ensureLoaded()

const isAuthed = computed(() => Boolean(user.value?.id))
const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const viewerIsPremium = computed(() => Boolean(user.value?.premium))

const post = ref<FeedPost | null>(null)
const errorText = ref<string | null>(null)
const accessHint = ref<'none' | 'verifiedOnly' | 'premiumOnly' | 'private'>('none')
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
if (error.value) {
  // Nuxt error shapes vary across SSR/client; normalize to something useful.
  const e: any = error.value
  const status = Number(e?.statusCode || e?.status || e?.response?.status || 0)
  const msg = (getApiErrorMessage(e) || 'Failed to load post.').toString()

  // Heuristic: infer restricted type from message so we can render + set redacted SEO
  // even when the API refuses to return the post body/author.
  const lower = msg.toLowerCase()
  if (status === 403) {
    if (lower.includes('verified')) accessHint.value = 'verifiedOnly'
    else if (lower.includes('premium')) accessHint.value = 'premiumOnly'
    else if (lower.includes('private')) accessHint.value = 'private'
  }

  if (status === 403) {
    errorText.value = msg
  } else if (status === 404) {
    errorText.value = 'Post not found.'
  } else {
    errorText.value = msg
  }
} else {
  errorText.value = null
}

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
  if (v === 'verifiedOnly' || v === 'premiumOnly' || v === 'onlyMe') return true
  return accessHint.value !== 'none'
})

const restrictionLabel = computed(() => {
  const v = post.value?.visibility
  if (v === 'verifiedOnly') return 'Verified-only post'
  if (v === 'premiumOnly') return 'Premium-only post'
  if (v === 'onlyMe') return 'Private post'
  if (accessHint.value === 'verifiedOnly') return 'Verified-only post'
  if (accessHint.value === 'premiumOnly') return 'Premium-only post'
  if (accessHint.value === 'private') return 'Private post'
  return 'Post'
})

const restrictionSeoDescription = computed(() => {
  const v = post.value?.visibility
  const hint = accessHint.value

  if (v === 'verifiedOnly' || hint === 'verifiedOnly') {
    return 'This post is only available to verified members.'
  }
  if (v === 'premiumOnly' || hint === 'premiumOnly') {
    return 'This post is only available to premium members.'
  }
  // Only-me: never reveal author or content.
  if (v === 'onlyMe' || hint === 'private') {
    return 'This post is private and only available to its author.'
  }
  return 'Post.'
})

const seoTitle = computed(() => {
  if (!post.value) return isRestricted.value ? restrictionLabel.value : 'Post'
  if (isRestricted.value) return restrictionLabel.value

  const username = (post.value.author.username ?? '').trim()
  const body = (post.value.body ?? '').trim()
  const bodySnippet = body ? excerpt(body, 56) : 'Post'
  return username ? `${bodySnippet} — @${username}` : bodySnippet
})

const seoDescription = computed(() => {
  if (!post.value) {
    if (!isRestricted.value) return 'Post.'
    return restrictionSeoDescription.value
  }
  if (isRestricted.value) {
    return restrictionSeoDescription.value
  }
  const body = (post.value.body ?? '').trim()
  return body ? excerpt(body, 190) : 'Post.'
})

const seoAuthor = computed(() => {
  if (!post.value || isRestricted.value) return siteConfig.name
  const username = (post.value.author.username ?? '').trim()
  return username ? `@${username}` : siteConfig.name
})

const seoImage = computed(() => {
  if (isRestricted.value) return '/images/logo-black-bg.png'
  // Prefer the author's avatar for “who said it?” in link previews.
  const avatar = (post.value?.author.avatarUrl ?? '').trim()
  return avatar || '/images/banner.png'
})

const seoImageAlt = computed(() => {
  if (isRestricted.value) return `${siteConfig.name} logo`
  const username = (post.value?.author.username ?? '').trim()
  return username ? `Post by @${username}` : `Post on ${siteConfig.name}`
})

function toAbs(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

const jsonLdGraph = computed(() => {
  if (!post.value || isRestricted.value) return []

  const username = (post.value.author.username ?? '').trim()
  const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
  const authorId = authorUrl ? `${authorUrl}#person` : `${siteConfig.url}/#organization`
  const avatarUrl = (post.value.author.avatarUrl ?? '').trim() || null
  const author: any = authorUrl
    ? {
        '@type': 'Person',
        '@id': authorId,
        name: username ? `@${username}` : siteConfig.name,
        url: authorUrl,
        ...(avatarUrl ? { image: avatarUrl } : {})
      }
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
      image: [toAbs('/images/banner.png'), avatarUrl].filter(Boolean),
      isAccessibleForFree: true,
    }
  ].filter(Boolean)
})

usePageSeo({
  title: seoTitle,
  description: seoDescription,
  canonicalPath,
  ogType: computed(() => (isRestricted.value ? 'website' : 'article')),
  image: seoImage,
  imageAlt: seoImageAlt,
  noindex: computed(() => isRestricted.value || Boolean(errorText.value)),
  author: seoAuthor,
  jsonLdGraph
})

// Extra share tags for article rich previews (public posts only).
useHead({
  meta: computed(() => {
    if (!post.value || isRestricted.value) return []
    const username = (post.value.author.username ?? '').trim()
    const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
    return [
      { property: 'article:published_time', content: post.value.createdAt },
      { property: 'article:modified_time', content: post.value.createdAt },
      ...(authorUrl ? [{ property: 'article:author', content: authorUrl }] : []),
    ]
  }),
})

const showLoginCta = computed(() => {
  if (isAuthed.value) return false
  // Only show login CTA when access is the problem (not generic 404).
  return accessHint.value !== 'none'
})

const errorTitle = computed(() => {
  if (!errorText.value) return ''
  if (accessHint.value !== 'none') return restrictionLabel.value
  return 'Post unavailable'
})

const errorBody = computed(() => {
  if (!errorText.value) return ''

  // Access-controlled posts
  if (accessHint.value !== 'none') {
    const parts: string[] = []
    if (!isAuthed.value) parts.push('You’re not logged in.')

    if (accessHint.value === 'verifiedOnly') {
      parts.push(
        isAuthed.value && !viewerIsVerified.value
          ? 'Your account is not verified yet.'
          : 'This post is visible to verified members only.',
      )
    } else if (accessHint.value === 'premiumOnly') {
      parts.push(
        isAuthed.value && !viewerIsPremium.value
          ? 'Your account does not have premium access.'
          : 'This post is visible to premium members only.',
      )
    } else if (accessHint.value === 'private') {
      parts.push('This post is private. If it’s yours, log in to view it.')
    } else {
      parts.push(errorText.value)
    }

    return parts.join(' ')
  }

  return errorText.value
})

function goToLogin() {
  const redirect = encodeURIComponent(route.fullPath)
  return navigateTo(`/login?redirect=${redirect}`)
}
</script>

