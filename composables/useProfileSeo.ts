import type { Ref } from 'vue'
import { siteConfig } from '~/config/site'
import { excerpt } from '~/utils/text'
import type { PublicProfile } from '~/composables/usePublicProfile'

export function useProfileSeo(options: {
  profile: Ref<PublicProfile | null>
  normalizedUsername: Ref<string>
  notFound: Ref<boolean>
  profileBanned?: Ref<boolean>
}) {
  const { profile, normalizedUsername, notFound, profileBanned } = options
  const banned = computed(() => Boolean(profileBanned?.value))

  const canonicalPath = computed(() => `/u/${encodeURIComponent(normalizedUsername.value)}`)

  const seoTitle = computed(() => {
    if (banned.value) return 'Account banned'
    if (notFound.value) return 'User not found'
    const u = (profile.value?.username ?? normalizedUsername.value).trim()
    const name = (profile.value?.name ?? '').trim()
    if (u && name) return `${name} (@${u})`
    if (u) return `@${u}`
    return 'Profile'
  })

  const seoDescription = computed(() => {
    if (banned.value) return 'This account has been banned.'
    if (notFound.value) return 'This profile does not exist.'
    const bio = (profile.value?.bio ?? '').trim()
    const u = (profile.value?.username ?? normalizedUsername.value).trim()
    const verified = profile.value?.verifiedStatus && profile.value.verifiedStatus !== 'none'
    const premium = profile.value?.premium === true
    const badges: string[] = []
    if (verified) badges.push('Verified')
    if (premium) badges.push('Premium')
    const badgeSuffix = badges.length ? ` ${badges.join(' · ')}.` : ''
    if (bio) return `${excerpt(bio, 220)}${badgeSuffix}`
    if (u) return `View @${u} on ${siteConfig.name}.${badgeSuffix}`
    return `View a profile on ${siteConfig.name}.${badgeSuffix}`
  })

  const seoImage = computed(() => {
    // Social previews: prefer banner (big, identity-rich), then avatar, then a safe default, then logo.
    // A > B > C > LOGO
    if (notFound.value || banned.value) return '/images/logo-black-bg.png'
    const banner = (profile.value?.bannerUrl ?? '').trim()
    const avatar = (profile.value?.avatarUrl ?? '').trim()
    const fallbackDefault = '/images/banner.png'
    const fallbackLogo = '/images/logo-black-bg.png'
    return banner || avatar || fallbackDefault || fallbackLogo
  })

  const seoImageAlt = computed(() => {
    const u = (profile.value?.username ?? normalizedUsername.value).trim()
    if (!u) return `Profile on ${siteConfig.name}`
    const name = (profile.value?.name ?? '').trim()
    return name ? `${name} (@${u})` : `@${u}`
  })

  const twitterCard = computed(() => {
    const img = (seoImage.value || '').toString()
    const avatar = (profile.value?.avatarUrl ?? '').toString()
    if (avatar && img === avatar) return 'summary' as const
    return 'summary_large_image' as const
  })

  const jsonLdGraph = computed(() => {
    if (notFound.value || banned.value || !profile.value?.username) return []

    const u = profile.value.username.trim()
    const url = `${siteConfig.url}/u/${encodeURIComponent(u)}`
    const bio = (profile.value.bio ?? '').trim()

    return [
      {
        '@type': 'Person',
        '@id': `${url}#person`,
        url,
        name: (profile.value.name ?? `@${u}`).trim(),
        description: bio ? excerpt(bio, 300) : undefined,
        image: profile.value.avatarUrl || undefined,
      },
    ]
  })

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
    canonicalPath,
    ogType: 'profile',
    image: seoImage,
    imageAlt: seoImageAlt,
    twitterCard,
    noindex: computed(() => notFound.value || banned.value),
    jsonLdGraph,
  })

  useHead({
    meta: computed(() => {
      if (notFound.value || banned.value) return []
      const u = (profile.value?.username ?? normalizedUsername.value).trim()
      if (!u) return []
      return [{ property: 'profile:username', content: u }]
    }),
  })

  return {
    seoTitle,
    seoDescription,
    seoImage,
    seoImageAlt,
    canonicalPath,
    twitterCard,
    jsonLdGraph,
  }
}
