import { siteConfig } from '~/config/site'
import { featurePageForPath } from '~/utils/feature-pages'
import { isSafeRedirect } from '~/utils/url'
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
  /** More specific schema type for pages centered on a public profile. */
  webPageType?: MaybeRef<'WebPage' | 'ProfilePage' | undefined>
  /** The JSON-LD identity described by the page, when provided in its graph. */
  mainEntityId?: MaybeRef<string | undefined>
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
    const isHome = route.path === '/' || unref(options.canonicalPath) === '/'
    if (isHome) return title.value

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
 
  // Auth redirects retain safe feature branding for crawlers; browser title/auth stay unchanged.
  const sharePath = computed(() => {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    return route.path === '/login' && isSafeRedirect(redirect) ? redirect! : route.fullPath
  })
  const feature = computed(() => featurePageForPath(sharePath.value))
  const isFeatureHandoff = computed(() => route.path === '/login' && Boolean(feature.value))
  const shareTitle = computed(() => isFeatureHandoff.value ? `${feature.value!.title} | ${siteConfig.name}` : fullTitle.value)
  const shareDescription = computed(() => isFeatureHandoff.value ? feature.value!.description : description.value)

  // Explicit content artwork wins; feature artwork is the shared fallback.
  const image = computed(() => toAbsoluteUrl(unref(options.image) || feature.value?.image || '/images/logo-black-bg-small.png'))
  const imageAlt = computed(() => (unref(options.imageAlt) || (feature.value ? `${feature.value.title} — ${siteConfig.name}` : `${siteConfig.name} logo`)).slice(0, 200))
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
 
    ogType: computed(() => unref(options.ogType) || 'website'),
    ogUrl: computed(() => isFeatureHandoff.value ? toAbsoluteUrl(sharePath.value) : canonical.value),
    ogSiteName: siteConfig.name,
    ogLocale: 'en_US',
    ogTitle: shareTitle,
    ogDescription: shareDescription,
    ogImage: image,
    ogImageAlt: imageAlt,
 
    twitterCard,
    twitterTitle: shareTitle,
    twitterDescription: shareDescription,
    twitterImage: image,
    twitterImageAlt: imageAlt,
    twitterSite: siteConfig.social.twitter,
    twitterCreator: siteConfig.social.twitter
  })
 
  const jsonLdGraph = computed(() => {
    const baseGraph: Array<Record<string, unknown>> = [
      {
        '@type': unref(options.webPageType) || 'WebPage',
        '@id': `${canonical.value}#webpage`,
        url: canonical.value,
        name: fullTitle.value,
        description: description.value,
        isPartOf: { '@id': `${siteConfig.url}/#website` },
        inLanguage: 'en-US',
        ...(unref(options.mainEntityId) ? { mainEntity: { '@id': unref(options.mainEntityId) } } : {}),
      }
    ]
 
    // Landing page: include WebSite + Organization as well (best practice).
    if (route.path === '/' || options.canonicalPath === '/') {
      const email = (siteConfig as { contactEmail?: string }).contactEmail
      const topics = (siteConfig as { topics?: string[] }).topics

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
            url: toAbsoluteUrl('/images/logo-black-bg-small.png'),
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
                text: 'Men of Hunger is a trusted community for American men who want real conversation. Men elsewhere are welcome. It is a house for discipline, ambition, fitness, leadership, faith, and family, with a daily check-in and conversations that stay on the record.',
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
    link: computed(() => [{ rel: 'canonical', href: canonical.value }]),
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
    script: computed(() => [
      {
        type: 'application/ld+json',
        // Profile text and links are user-controlled. Never allow a literal
        // closing script tag to escape the JSON-LD element in server HTML.
        innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLdGraph.value }).replace(/</g, '\\u003c')
      }
    ])
  })
 
  return { title: fullTitle, description, canonical, image }
}
