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
  /** OG image width (default 1200). Set when image dimensions are known for better unfurls. */
  imageWidth?: MaybeRef<number | undefined>
  /** OG image height (default 630). Set when image dimensions are known for better unfurls. */
  imageHeight?: MaybeRef<number | undefined>
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
  const config = useRuntimeConfig()
  const facebookAppId = computed(() => String(config.public.facebookAppId || '').trim())

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
      const email = (siteConfig as any).contactEmail as string | undefined
      const topics = (siteConfig as any).topics as string[] | undefined

      baseGraph.unshift(
        {
          '@type': 'WebSite',
          '@id': `${siteConfig.url}/#website`,
          url: siteConfig.url,
          name: siteConfig.name,
          description: siteConfig.meta.description,
          inLanguage: 'en-US',
          publisher: { '@id': `${siteConfig.url}/#organization` },
          // Sitelinks Searchbox: lets Google show a search field under the result.
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${siteConfig.url}/explore?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'Organization',
          '@id': `${siteConfig.url}/#organization`,
          name: siteConfig.name,
          alternateName: 'MOH',
          url: siteConfig.url,
          description: siteConfig.meta.description,
          logo: {
            '@type': 'ImageObject',
            url: toAbsoluteUrl('/images/logo-black-bg.png'),
            width: 512,
            height: 512,
          },
          image: toAbsoluteUrl('/images/banner.png'),
          foundingDate: String(siteConfig.established),
          // knowsAbout tells Google what topics this entity covers — key for E-E-A-T.
          ...(topics?.length ? { knowsAbout: topics } : {}),
          // contactPoint helps Google trust the entity as real / reachable.
          ...(email ? {
            contactPoint: {
              '@type': 'ContactPoint',
              email,
              contactType: 'customer support',
              availableLanguage: 'English',
            },
          } : {}),
          sameAs: [
            // Explicit xUrl takes priority over the derived twitter profile URL so we get
            // the canonical https://x.com/... form Google prefers for entity association.
            (siteConfig.social as { xUrl?: string })?.xUrl || twitterProfileUrl(siteConfig.social.twitter),
            (siteConfig.social as { meetup?: string })?.meetup,
          ].filter(Boolean),
        },
        // FAQ schema on the homepage — eligible for "People also ask" boxes in SERPs.
        {
          '@type': 'FAQPage',
          '@id': `${siteConfig.url}/#faq`,
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What is Men of Hunger?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Men of Hunger is a trusted online community for men who want measurable progress in life — covering discipline, ambition, fitness, leadership, faith, and family. It features structured conversations, daily check-ins, accountability tools, cohorts, and premium playbooks.',
              },
            },
            {
              '@type': 'Question',
              name: 'How do I join Men of Hunger?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Sign up at menofhunger.com with your phone number, set up your profile, and start participating. Full participation — posting, replying, and accessing verified-only content — requires identity verification, which keeps the community trustworthy and real.',
              },
            },
            {
              '@type': 'Question',
              name: 'What is verification on Men of Hunger?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Verification on Men of Hunger is an identity confirmation step that unlocks full participation — posting, replying, and accessing verified-only content. It keeps the community accountable and filters out bad actors.',
              },
            },
            {
              '@type': 'Question',
              name: 'What does a premium membership include?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Premium membership on Men of Hunger includes access to structured cohorts, workshops, premium-only articles and playbooks, and a higher tier of engagement within the community.',
              },
            },
            {
              '@type': 'Question',
              name: 'Is there a Men of Hunger meetup or in-person group?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Men of Hunger hosts local meetups in Roanoke, VA. Details and RSVP are available at the Meetup group: meetup.com/menofhunger.',
              },
            },
          ],
        }
      )
    }
 
    return [...baseGraph, ...(unref(options.jsonLdGraph) || [])]
  })
 
  const imageWidth = computed(() => {
    const w = unref(options.imageWidth)
    return typeof w === 'number' && w > 0 ? String(w) : '1200'
  })
  const imageHeight = computed(() => {
    const h = unref(options.imageHeight)
    return typeof h === 'number' && h > 0 ? String(h) : '630'
  })

  useHead({
    link: [{ rel: 'canonical', href: canonical.value }],
    meta: computed(() => {
      const meta: Array<{ property?: string; name?: string; content: string }> = [
        { name: 'robots', content: robots.value },
        { name: 'keywords', content: siteConfig.meta.keywords },
        { name: 'author', content: author.value },
        { property: 'og:image:width', content: imageWidth.value },
        { property: 'og:image:height', content: imageHeight.value }
      ]
      if (facebookAppId.value) {
        meta.push({ property: 'fb:app_id', content: facebookAppId.value })
      }
      return meta
    }),
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLdGraph.value })
      }
    ]
  })
 
  return { title: fullTitle, description, canonical, image }
}

