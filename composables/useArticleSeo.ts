import type { Ref } from 'vue'
import type { Article } from '~/types/api'
import { siteConfig } from '~/config/site'
import { excerpt } from '~/utils/text'

function splitSiteKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

function cleanKeywordTerm(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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
    const name = (a.author?.name ?? '').trim()
    const username = (a.author?.username ?? '').trim()
    const authorLabel = name || (username ? `@${username}` : '')
    return authorLabel ? `${title} — ${authorLabel}` : title
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
    const name = (article.value?.author?.name ?? '').trim()
    const username = (article.value?.author?.username ?? '').trim()
    return name || (username ? `@${username}` : siteConfig.name)
  })

  const articleTags = computed(() => {
    const a = article.value
    if (!a || isRestricted.value) return [] as Array<{ slug: string; label: string }>
    return (a.tags ?? [])
      .map((t) => ({
        slug: (t.tag ?? '').trim(),
        label: (t.label ?? '').trim(),
      }))
      .filter((t) => t.slug || t.label)
  })

  const articleSeoKeywords = computed(() => {
    const a = article.value
    if (!a || isRestricted.value) return ''

    const titleWords = cleanKeywordTerm(a.title ?? '')
      .split(' ')
      .filter((w) => w.length > 3)
      .slice(0, 8)

    const tagLabels = articleTags.value
      .map((t) => t.label || t.slug)
      .filter(Boolean)
      .slice(0, 12)

    const tagSlugs = articleTags.value
      .map((t) => t.slug)
      .filter(Boolean)
      .slice(0, 12)

    const siteKeywords = splitSiteKeywords(siteConfig.meta.keywords)

    const deduped = Array.from(
      new Set(
        [...tagLabels, ...tagSlugs, ...titleWords, ...siteKeywords]
          .map((k) => k.trim())
          .filter(Boolean),
      ),
    )
    // Keep keywords concise; search engines ignore overlong keyword strings.
    return deduped.slice(0, 20).join(', ')
  })

  const jsonLdGraph = computed(() => {
    const a = article.value
    if (!a || isRestricted.value) return []

    const username = (a.author?.username ?? '').trim()
    const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
    const authorId = authorUrl ? `${authorUrl}#person` : `${siteConfig.url}/#organization`
    const avatarUrl = (a.author?.avatarUrl ?? '').trim() || null

    const authorName = ((a.author?.name ?? '').trim()) || (username ? `@${username}` : siteConfig.name)
    const authorNode: Record<string, unknown> = authorUrl
      ? {
          '@type': 'Person',
          '@id': authorId,
          name: authorName,
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
    const sectionLabel = articleTags.value[0]?.label || articleTags.value[0]?.slug || 'Articles'
    const topicMentions = articleTags.value
      .map((t) => t.slug)
      .filter(Boolean)
      .slice(0, 10)
      .map((slug) => ({
        '@type': 'Thing',
        name: slug,
        sameAs: `${siteConfig.url}/topics/${encodeURIComponent(slug)}`,
      }))

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
      articleSection: sectionLabel,
      ...(articleTags.value.length
        ? { keywords: articleTags.value.map((t) => t.label || t.slug).filter(Boolean) }
        : {}),
      ...(topicMentions.length ? { about: topicMentions } : {}),
      isAccessibleForFree: true,
      // Reading time for Google Discover signals
      ...(a.readingTimeMinutes ? { timeRequired: `PT${a.readingTimeMinutes}M` } : {}),
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'http://schema.org/CommentAction',
          userInteractionCount: a.commentCount ?? 0,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/ReadAction',
          userInteractionCount: a.viewCount ?? 0,
        },
      ],
    }

    // BreadcrumbList: Articles > Article Title — shows site hierarchy in SERPs.
    const breadcrumb = {
      '@type': 'BreadcrumbList',
      '@id': `${siteConfig.url}${canonicalPath.value}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: siteConfig.name,
          item: siteConfig.url,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Articles',
          item: `${siteConfig.url}/articles`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: excerpt(a.title ?? 'Article', 80),
          item: `${siteConfig.url}${canonicalPath.value}`,
        },
      ],
    }

    return [authorUrl ? authorNode : null, articleNode, breadcrumb].filter(Boolean)
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

  // article:* Open Graph tags + per-article keywords meta (public only)
  useHead({
    meta: computed(() => {
      const a = article.value
      if (!a || isRestricted.value) return []
      const username = (a.author?.username ?? '').trim()
      const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
      const publishedAt = a.publishedAt ?? a.createdAt
      const modifiedAt = a.editedAt ?? publishedAt

      // Build per-page keywords: site keywords + title words (stops at 10 terms, ~160 chars).
      const keywords = articleSeoKeywords.value

      const meta: Array<{ property?: string; name?: string; content: string }> = [
        { property: 'article:published_time', content: publishedAt ?? '' },
        { property: 'article:modified_time', content: modifiedAt ?? '' },
        { name: 'keywords', content: keywords },
      ]
      if (authorUrl) {
        meta.push({ property: 'article:author', content: authorUrl })
      }
      for (const t of articleTags.value) {
        const term = (t.label || t.slug).trim()
        if (term) meta.push({ property: 'article:tag', content: term })
      }
      return meta
    }),
  })
}
