import { isInteractiveTarget } from '~/utils/interactive-target'
import { formatCompact, formatCount } from '~/utils/number-format'
import { siteConfig } from '~/config/site'
import { VOICE } from '~/config/voice'
import type { BreakdownRow, BreakdownSection } from '~/components/app/kit/LandingStatBreakdown.vue'
import type { LandingSnapshot, LandingTopPost } from '~/types/api'

export async function useIndexPage() {

useHead({
  htmlAttrs: { class: 'moh-landing' }
})

const roanokeMeetupUrl = siteConfig.social.meetup
const currentYear = new Date().getUTCFullYear()
const isRoanokeOpen = ref(false)
const isMobileMenuOpen = ref(false)
useOverlayDismiss(isMobileMenuOpen, () => { isMobileMenuOpen.value = false })

const joiningSteps = [
  { title: 'Join', body: 'Create your profile.' },
  { title: 'Verify', body: 'Trust comes first.' },
  { title: 'Say something', body: 'Post and reply.' },
  { title: 'Show up', body: 'Come back and stand with the men beside you.' },
]
const landingNavLinks = [
  { label: 'About', to: '/about' },
]
const landingFooterLinks = [
  { label: 'About', to: '/about' },
  { label: 'Status', to: '/status' },
  { label: 'RSS', to: '/feeds' },
]
const colorMode = useColorMode()
const landingThemeReady = ref(false)
const useLightLandingImages = computed(() => landingThemeReady.value && colorMode.value === 'light')
const landingHeroSrc = computed(() => (
  useLightLandingImages.value ? '/images/landing-light.webp' : '/images/landing-dark.webp'
))
const landingHeroAlt = computed(() => (
  useLightLandingImages.value
    ? 'Men standing on a mountain path'
    : 'Men standing on a mountain path at night'
))

onMounted(() => {
  landingThemeReady.value = true
})

watch(isRoanokeOpen, (open) => {
  if (import.meta.client) {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
})

// Preserve the canonical tagline while emphasizing its central promise.
const taglineParts = computed(() => {
  const text = VOICE.tagline
  const keyword = 'real conversation'
  const idx = text.indexOf(keyword)
  if (idx === -1) return { before: text, keyword: '', after: '' }
  return {
    before: text.slice(0, idx),
    keyword: text.slice(idx, idx + keyword.length),
    after: text.slice(idx + keyword.length),
  }
})

const { apiFetchData } = useApiClient()

const landingSnapshotRequest = useAsyncData<LandingSnapshot>(
  'landing:snapshot',
  () => apiFetchData<LandingSnapshot>('/meta/landing', { method: 'GET' }),
  { server: true },
)
const { data: landingSnapshotData } = landingSnapshotRequest
const landingSnapshot = computed(() => landingSnapshotData.value ?? null)
const recentlyActiveMen = computed(() => landingSnapshot.value?.recentlyActiveMen ?? [])
const topPostsThisWeek = computed(() => landingSnapshot.value?.topPostsThisWeek ?? [])

function pickDistinctAuthorPosts(pool: LandingTopPost[], count: number): LandingTopPost[] {
  const seen = new Set<string>()
  const result: LandingTopPost[] = []
  for (const post of pool) {
    if (result.length >= count) break
    const authorId = post.author?.id ?? post.id
    if (!seen.has(authorId)) {
      seen.add(authorId)
      result.push(post)
    }
  }
  for (const post of pool) {
    if (result.length >= count) break
    if (!result.includes(post)) result.push(post)
  }
  return result
}

const clientFeaturedTopPosts = ref<LandingTopPost[] | null>(null)
const featuredTopPosts = computed<LandingTopPost[]>(() => {
  if (clientFeaturedTopPosts.value) return clientFeaturedTopPosts.value
  return pickDistinctAuthorPosts(topPostsThisWeek.value, 3)
})

const { observe: observePost } = usePostViewTracker()
const landingPostCardEls: Array<HTMLElement | null> = []
const landingPostCleanups: Array<() => void> = []

function setLandingPostCardEl(i: number, el: unknown) {
  landingPostCardEls[i] = el instanceof HTMLElement ? el : null
}

function attachLandingPostObservers() {
  for (const fn of landingPostCleanups.splice(0)) fn()
  featuredTopPosts.value.forEach((post, i) => {
    const el = landingPostCardEls[i] ?? null
    if (!el || post.viewerCanAccess === false) return
    const cleanup = observePost(post.id, el)
    if (cleanup) landingPostCleanups.push(cleanup)
  })
}

onMounted(async () => {
  const pool = [...topPostsThisWeek.value]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = pool[i] as LandingTopPost
    pool[i] = pool[j] as LandingTopPost
    pool[j] = tmp
  }
  clientFeaturedTopPosts.value = pickDistinctAuthorPosts(pool, 3)
  await nextTick()
  attachLandingPostObservers()
})

onBeforeUnmount(() => {
  for (const fn of landingPostCleanups.splice(0)) fn()
})

function formatLandingCount(value: number): string {
  return formatCompact(value, { compactFrom: 1_000 })
}

const menBreakdownTitle = computed(() => {
  const s = landingSnapshot.value?.stats.men
  if (!s) return 'verified men'
  const contributors = Math.min(Math.max(0, s.contributors ?? 0), s.total)
  return `${formatCount(contributors)} of ${formatCount(s.total)} have posted`
})

const menBreakdownSections = computed<BreakdownSection[]>(() => {
  const s = landingSnapshot.value?.stats.men
  if (!s) return []
  return [
    [
      { key: 'premium', label: 'Premium', count: s.premium, dotClass: 'bg-yellow-400' },
      { key: 'verified', label: 'Verified', count: s.verified, dotClass: 'bg-blue-400' },
    ],
    [
      { key: 'originalAuthors', label: 'Wrote originals', count: s.originalAuthors ?? 0 },
      {
        key: 'topAuthor',
        label: 'Top author',
        count: s.topAuthorSharePercent ?? 0,
        format: 'percent',
        keepZero: (s.contributors ?? 0) > 0,
      },
      {
        key: 'top5',
        label: 'Top 5 authors',
        count: s.top5SharePercent ?? 0,
        format: 'percent',
        keepZero: (s.contributors ?? 0) > 0,
      },
      {
        key: 'median',
        label: 'Median each',
        count: s.medianPostsPerContributor ?? 0,
        keepZero: (s.contributors ?? 0) > 0,
      },
    ],
  ]
})

const postsBreakdownSections = computed<BreakdownSection[]>(() => {
  const s = landingSnapshot.value?.stats.posts
  if (!s) return []
  return [
    [
      { key: 'original', label: 'Original', count: s.original ?? 0 },
      { key: 'replies', label: 'Replies', count: s.replies ?? 0 },
    ],
    [
      { key: 'public', label: 'Public', count: s.public, dotClass: 'bg-gray-400' },
      { key: 'verified', label: 'Verified', count: s.verified, dotClass: 'bg-blue-400' },
      { key: 'premium', label: 'Premium', count: s.premium, dotClass: 'bg-yellow-400' },
    ],
  ]
})

const articlesBreakdownSections = computed<BreakdownSection[]>(() => {
  const s = landingSnapshot.value?.stats.articles
  if (!s) return []
  return [
    [
      { key: 'public', label: 'Public', count: s.public, dotClass: 'bg-gray-400' },
      { key: 'verified', label: 'Verified', count: s.verified, dotClass: 'bg-blue-400' },
      { key: 'premium', label: 'Premium', count: s.premium, dotClass: 'bg-yellow-400' },
    ],
    [
      { key: 'authors', label: 'Authors', count: s.authors },
      { key: 'unique', label: 'Readers', count: s.unique },
      { key: 'views', label: 'Total views', count: s.views },
    ],
  ]
})

/** Up to three published articles the viewer can open, in trending order. */
const trendingArticles = computed(() => (landingSnapshot.value?.trendingArticles ?? []).filter(article => !article.isDraft && !article.deletedAt).slice(0, 3))
function articleHref(article: { id: string }): string { return `/a/${encodeURIComponent(article.id)}` }
function articleReadLabel(article: { readingTimeMinutes?: number }): string | null {
  const minutes = article.readingTimeMinutes
  return minutes && minutes > 0 ? `${minutes} min read` : null
}

const viewsBreakdownRows = computed<BreakdownRow[]>(() => {
  const s = landingSnapshot.value?.stats.views
  if (!s) return []
  return [
    { key: 'unique', label: 'Unique views', count: s.unique ?? s.total },
    { key: 'premium', label: 'Premium', count: s.premium, dotClass: 'bg-yellow-400' },
    { key: 'verified', label: 'Verified', count: s.verified, dotClass: 'bg-blue-400' },
    { key: 'unverified', label: 'Unverified', count: s.unverified, dotClass: 'bg-gray-400' },
    { key: 'guest', label: 'Guests', count: s.guest, dotClass: 'bg-gray-500/60' },
  ]
})

function postHref(post: LandingTopPost): string {
  return `/p/${encodeURIComponent(post.id)}`
}

function authorHref(post: LandingTopPost): string {
  const username = String(post.author.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : postHref(post)
}

function onLandingPostRowClick(href: string, e: MouseEvent) {
  if (isInteractiveTarget(e.target, 'basic')) return
  if (e.metaKey || e.ctrlKey) {
    window.open(href, '_blank')
    return
  }
  void navigateTo(href)
}

function onLandingPostRowAuxClick(href: string, e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target, 'basic')) return
  e.preventDefault()
  window.open(href, '_blank')
}

usePageSeo({
  ...siteConfig.homeShare,
  description: siteConfig.meta.description,
  canonicalPath: '/',
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
await landingSnapshotRequest
  return {
    setLandingPostCardEl,
    formatLandingCount,
    postHref,
    authorHref,
    onLandingPostRowClick,
    onLandingPostRowAuxClick,
    roanokeMeetupUrl,
    currentYear,
    isRoanokeOpen,
    isMobileMenuOpen,
    joiningSteps,
    landingNavLinks,
    landingFooterLinks,
    landingHeroSrc,
    landingHeroAlt,
    taglineParts,
    landingSnapshot,
    recentlyActiveMen,
    topPostsThisWeek,
    featuredTopPosts,
    menBreakdownTitle,
    menBreakdownSections,
    postsBreakdownSections,
    viewsBreakdownRows,
    articlesBreakdownSections,
    trendingArticles,
    articleHref,
    articleReadLabel,
  }
}
