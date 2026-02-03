import { siteConfig } from '~/config/site'
import type { MaybeRef } from 'vue'
 
type OgType = 'website' | 'article' | 'profile'
 
export type PageSeoOptions = {
  /** Page title (without site suffix). Falls back to route meta title or site title. */
  title?: MaybeRef<string | undefined>
  /** Page description. Falls back to site description. */
  description?: MaybeRef<string | undefined>
  /** Absolute URL for OG/Twitter image. Defaults to site logo image. */
  image?: MaybeRef<string | undefined>
  /** Alt text for OG/Twitter image (avoid leaking restricted content). */
  imageAlt?: MaybeRef<string | undefined>
  /** Override canonical path (e.g. '/about'). Defaults to current route path. */
  canonicalPath?: MaybeRef<string | undefined>
  /** OpenGraph type */
  ogType?: MaybeRef<OgType | undefined>
  /** Twitter card type */
  twitterCard?: MaybeRef<'summary' | 'summary_large_image' | undefined>
  /** Prevent indexing (e.g. internal tools pages). */
  noindex?: MaybeRef<boolean | undefined>
  /** Optional author meta override (avoid for restricted content). */
  author?: MaybeRef<string | undefined>
  /** Extra JSON-LD objects to add to @graph */
  jsonLdGraph?: MaybeRef<unknown[] | undefined>
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
    const t = unref(options.title) || (route.meta?.title as string | undefined)
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
    const d = unref(options.description) || (route.meta?.description as string | undefined)
    return (d?.trim() || siteConfig.meta.description).slice(0, 300)
  })
 
  const canonical = computed(() => {
    const path = unref(options.canonicalPath) || route.path || '/'
    return toAbsoluteUrl(path)
  })
 
  // Default to dark/black logo for social previews unless a page overrides it.
  const image = computed(() => toAbsoluteUrl(unref(options.image) || '/images/logo-black-bg.png'))
  const imageAlt = computed(() => (unref(options.imageAlt) || `${siteConfig.name} logo`).slice(0, 200))
  const twitterCard = computed(() => unref(options.twitterCard) || 'summary_large_image')
  const robots = computed(() =>
    unref(options.noindex)
      ? 'noindex,nofollow'
      : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
  )
  const author = computed(() => (unref(options.author) || siteConfig.name).slice(0, 120))
 
  useSeoMeta({
    title: fullTitle,
    description,
 
    ogType: unref(options.ogType) || 'website',
    ogUrl: canonical,
    ogSiteName: siteConfig.name,
    ogLocale: 'en_US',
    ogTitle: fullTitle,
    ogDescription: description,
    ogImage: image,
    ogImageAlt: imageAlt,
 
    twitterCard,
    twitterTitle: fullTitle,
    twitterDescription: description,
    twitterImage: image,
    twitterImageAlt: imageAlt,
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
          description: siteConfig.meta.description,
          logo: toAbsoluteUrl('/images/logo-black-bg.png'),
          foundingDate: String(siteConfig.established),
          sameAs: [
            twitterProfileUrl(siteConfig.social.twitter),
            (siteConfig.social as { meetup?: string })?.meetup
          ].filter(Boolean)
        }
      )
    }
 
    return [...baseGraph, ...(unref(options.jsonLdGraph) || [])]
  })
 
  useHead({
    link: [{ rel: 'canonical', href: canonical.value }],
    meta: [
      { name: 'robots', content: robots.value },
      { name: 'keywords', content: siteConfig.meta.keywords },
      { name: 'author', content: author.value },
      // Helpful for link unfurlers; safe defaults for our OG image.
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' }
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLdGraph.value })
      }
    ]
  })
 
  return { title: fullTitle, description, canonical, image }
}

