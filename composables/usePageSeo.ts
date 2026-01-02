import { siteConfig } from '~/config/site'
 
type OgType = 'website' | 'article'
 
export type PageSeoOptions = {
  /** Page title (without site suffix). Falls back to route meta title or site title. */
  title?: string
  /** Page description. Falls back to site description. */
  description?: string
  /** Absolute URL for OG/Twitter image. Defaults to site logo image. */
  image?: string
  /** Override canonical path (e.g. '/about'). Defaults to current route path. */
  canonicalPath?: string
  /** OpenGraph type */
  ogType?: OgType
  /** Prevent indexing (e.g. internal tools pages). */
  noindex?: boolean
  /** Extra JSON-LD objects to add to @graph */
  jsonLdGraph?: unknown[]
}
 
function toAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}
 
function twitterProfileUrl(handle: string | undefined) {
  const h = (handle || '').trim()
  if (!h) return ''
  const user = h.replace(/^@/, '')
  return `https://x.com/${user}`
}
 
export function usePageSeo(options: PageSeoOptions = {}) {
  const route = useRoute()
 
  const title = computed(() => {
    const t = options.title || (route.meta?.title as string | undefined)
    return t?.trim() || siteConfig.meta.title
  })

  const fullTitle = computed(() => {
    // Keep landing page clean (no duplicated site name)
    const isHome = route.path === '/' || options.canonicalPath === '/'
    if (isHome) return siteConfig.meta.title

    const t = title.value
    if (!t || t === siteConfig.meta.title) return siteConfig.meta.title
    return `${t} | ${siteConfig.name}`
  })
 
  const description = computed(() => {
    const d = options.description || (route.meta?.description as string | undefined)
    return (d?.trim() || siteConfig.meta.description).slice(0, 300)
  })
 
  const canonical = computed(() => {
    const path = options.canonicalPath || route.path || '/'
    return toAbsoluteUrl(path)
  })
 
  const image = computed(() => toAbsoluteUrl(options.image || '/images/logo-white-bg.png'))
  const robots = computed(() =>
    options.noindex
      ? 'noindex,nofollow'
      : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
  )
 
  useSeoMeta({
    title: fullTitle,
    description,
 
    ogType: options.ogType || 'website',
    ogUrl: canonical,
    ogSiteName: siteConfig.name,
    ogLocale: 'en_US',
    ogTitle: fullTitle,
    ogDescription: description,
    ogImage: image,
    ogImageAlt: `${siteConfig.name} logo`,
 
    twitterCard: 'summary_large_image',
    twitterTitle: fullTitle,
    twitterDescription: description,
    twitterImage: image,
    twitterImageAlt: `${siteConfig.name} logo`,
    twitterSite: siteConfig.social.twitter,
    twitterCreator: siteConfig.social.twitter
  })
 
  const jsonLdGraph = computed(() => {
    const baseGraph: any[] = [
      {
        '@type': 'WebPage',
        '@id': `${canonical.value}#webpage`,
        url: canonical.value,
        name: fullTitle.value,
        description: description.value,
        isPartOf: { '@id': `${siteConfig.url}/#website` },
        inLanguage: 'en-US'
      }
    ]
 
    // Landing page: include WebSite + Organization as well (best practice).
    if (route.path === '/' || options.canonicalPath === '/') {
      baseGraph.unshift(
        {
          '@type': 'WebSite',
          '@id': `${siteConfig.url}/#website`,
          url: siteConfig.url,
          name: siteConfig.name,
          description: siteConfig.meta.description,
          inLanguage: 'en-US',
          publisher: { '@id': `${siteConfig.url}/#organization` }
        },
        {
          '@type': 'Organization',
          '@id': `${siteConfig.url}/#organization`,
          name: siteConfig.name,
          url: siteConfig.url,
          logo: toAbsoluteUrl('/images/logo-white-bg.png'),
          foundingDate: siteConfig.established,
          sameAs: [twitterProfileUrl(siteConfig.social.twitter)].filter(Boolean)
        }
      )
    }
 
    return [...baseGraph, ...(options.jsonLdGraph || [])]
  })
 
  useHead({
    link: [{ rel: 'canonical', href: canonical.value }],
    meta: [
      { name: 'robots', content: robots.value },
      { name: 'keywords', content: siteConfig.meta.keywords },
      { name: 'author', content: siteConfig.name },
      // Helpful for link unfurlers; safe defaults for our OG image.
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' }
    ],
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLdGraph.value })
      }
    ]
  })
 
  return { title: fullTitle, description, canonical, image }
}

