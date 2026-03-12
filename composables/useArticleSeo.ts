import type { Ref } from 'vue'
import type { Article } from '~/types/api'
import { siteConfig } from '~/config/site'
import { excerpt } from '~/utils/text'

function toAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

export function useArticleSeo(article: Ref<Article | null | undefined>) {
  const isRestricted = computed(() => {
    const v = article.value?.visibility
    return v === 'premiumOnly' || v === 'verifiedOnly'
  })

  const canonicalPath = computed(() => `/a/${article.value?.id ?? ''}`)

  const seoTitle = computed(() => {
    const a = article.value
    if (!a) return 'Article'
    const title = (a.title ?? '').trim()
    if (!title) return siteConfig.name
    if (isRestricted.value) return title
    const username = (a.author?.username ?? '').trim()
    return username ? `${title} — @${username}` : title
  })

  const seoDescription = computed(() => {
    const a = article.value
    if (!a) return siteConfig.meta.description
    if (isRestricted.value) {
      const label = a.visibility === 'premiumOnly' ? 'premium' : 'verified'
      return `This article is for ${label} members of ${siteConfig.name}.`
    }
    const ex = (a.excerpt ?? '').trim()
    return excerpt(ex || siteConfig.meta.description, 190)
  })

  const seoImage = computed(() => {
    if (isRestricted.value) return '/images/logo-black-bg.png'
    const a = article.value
    if (!a) return '/images/logo-black-bg.png'
    const thumb = (a.thumbnailUrl ?? '').trim()
    if (thumb) return thumb
    const avatar = (a.author?.avatarUrl ?? '').trim()
    if (avatar) return avatar
    return '/images/banner.png'
  })

  const seoImageAlt = computed(() => {
    if (isRestricted.value) return `${siteConfig.name} logo`
    const a = article.value
    if (!a) return `${siteConfig.name} logo`
    const username = (a.author?.username ?? '').trim()
    const title = (a.title ?? '').trim()
    if (title && username) return `${title} — @${username}`
    return title || `Article on ${siteConfig.name}`
  })

  const seoAuthor = computed(() => {
    if (isRestricted.value) return undefined
    const username = (article.value?.author?.username ?? '').trim()
    return username ? `@${username}` : siteConfig.name
  })

  const jsonLdGraph = computed(() => {
    const a = article.value
    if (!a || isRestricted.value) return []

    const username = (a.author?.username ?? '').trim()
    const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
    const authorId = authorUrl ? `${authorUrl}#person` : `${siteConfig.url}/#organization`
    const avatarUrl = (a.author?.avatarUrl ?? '').trim() || null

    const authorNode: Record<string, unknown> = authorUrl
      ? {
          '@type': 'Person',
          '@id': authorId,
          name: username ? `@${username}` : siteConfig.name,
          url: authorUrl,
          ...(avatarUrl ? { image: avatarUrl } : {}),
        }
      : { '@type': 'Organization', '@id': `${siteConfig.url}/#organization`, name: siteConfig.name, url: siteConfig.url }

    const images: string[] = []
    const thumb = (a.thumbnailUrl ?? '').trim()
    if (thumb) images.push(toAbsoluteUrl(thumb))
    if (avatarUrl) images.push(toAbsoluteUrl(avatarUrl))
    images.push(toAbsoluteUrl('/images/banner.png'))

    const publishedAt = a.publishedAt ?? a.createdAt
    const modifiedAt = a.editedAt ?? publishedAt

    const articleNode: Record<string, unknown> = {
      '@type': 'Article',
      '@id': `${siteConfig.url}${canonicalPath.value}#article`,
      mainEntityOfPage: { '@id': `${siteConfig.url}${canonicalPath.value}#webpage` },
      headline: excerpt(a.title ?? '', 110),
      description: seoDescription.value,
      datePublished: publishedAt,
      dateModified: modifiedAt,
      author: { '@id': authorId },
      publisher: { '@id': `${siteConfig.url}/#organization` },
      image: Array.from(new Set(images)).filter(Boolean),
      isAccessibleForFree: true,
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'http://schema.org/CommentAction',
          userInteractionCount: a.commentCount ?? 0,
        },
      ],
    }

    return [authorUrl ? authorNode : null, articleNode].filter(Boolean)
  })

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
    image: seoImage,
    imageAlt: seoImageAlt,
    canonicalPath,
    ogType: computed(() => (isRestricted.value ? 'website' : 'article')),
    twitterCard: computed(() => (isRestricted.value ? 'summary' : 'summary_large_image')),
    noindex: computed(() => isRestricted.value || !article.value),
    author: seoAuthor,
    jsonLdGraph,
  })

  // Extra article:* Open Graph tags (public only)
  useHead({
    meta: computed(() => {
      const a = article.value
      if (!a || isRestricted.value) return []
      const username = (a.author?.username ?? '').trim()
      const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
      const publishedAt = a.publishedAt ?? a.createdAt
      const modifiedAt = a.editedAt ?? publishedAt
      const meta: Array<{ property: string; content: string }> = [
        { property: 'article:published_time', content: publishedAt ?? '' },
        { property: 'article:modified_time', content: modifiedAt ?? '' },
      ]
      if (authorUrl) {
        meta.push({ property: 'article:author', content: authorUrl })
      }
      return meta
    }),
  })
}
