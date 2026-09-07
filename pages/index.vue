<template>
  <!-- Figma: UI Library / 05 · Landing redesign (134:3 desktop, 143:215 mobile). -->
  <div class="landing-page">
    <header class="landing-shell landing-nav">
      <NuxtLink to="/" class="landing-brand" :aria-label="siteConfig.name">
        <AppLogo :alt="siteConfig.name" :width="40" :height="40" img-class="landing-logo" />
        <span>{{ siteConfig.name }}</span>
      </NuxtLink>
      <nav class="landing-desktop-links" aria-label="Main navigation">
        <NuxtLink v-for="link in landingNavLinks" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
        <a href="https://merch.menofhunger.com" target="_blank" rel="noopener noreferrer">Merch <Icon name="tabler:arrow-up-right" aria-hidden="true" /></a>
      </nav>
      <div class="landing-desktop-actions">
        <Button as="NuxtLink" to="/login" text rounded severity="secondary" class="landing-button">Log in</Button>
        <Button as="NuxtLink" to="/login" rounded class="landing-button">Join now</Button>
      </div>
      <Button
        type="button" text rounded severity="secondary" class="landing-mobile-toggle landing-button"
        aria-haspopup="dialog" :aria-expanded="isMobileMenuOpen" aria-controls="landing-mobile-menu"
        @click="isMobileMenuOpen = true"
      >Menu</Button>
    </header>

    <div class="landing-content">
      <section class="landing-shell landing-hero" aria-labelledby="landing-title">
        <div class="landing-intro">
          <p class="landing-eyebrow landing-trust"><AppIconGlyph name="verified" selected :size="18" />Trust-first, men-only</p>
          <h1 id="landing-title">{{ taglineParts.before }}<span>{{ taglineParts.keyword }}</span>{{ taglineParts.after }}</h1>
          <p class="landing-description">{{ VOICE.lodgeDescription }}</p>
          <div class="landing-actions">
            <Button as="NuxtLink" to="/login" rounded class="landing-button">Join now</Button>
            <Button as="NuxtLink" to="/home" text rounded severity="secondary" class="landing-button">
              Explore the feed <Icon name="tabler:arrow-right" aria-hidden="true" />
            </Button>
          </div>
          <div v-if="recentlyActiveMen.length" class="landing-social-proof">
            <div class="landing-avatars">
              <NuxtLink
                v-for="man in recentlyActiveMen.slice(0, 7)" :key="man.id"
                :to="man.username ? `/u/${encodeURIComponent(man.username)}` : '/home'"
                :class="avatarRoundClass(Boolean(man.isOrganization))"
                :aria-label="`View ${man.name || man.username || 'member'} profile`"
              >
                <AppUserAvatar :user="man" size-class="h-8 w-8" bg-class="moh-surface" :show-presence="false" />
              </NuxtLink>
            </div>
            <p>Men showing up. Every day.</p>
          </div>
        </div>
        <figure class="landing-photography">
          <img
            :src="landingHeroSrc" :alt="landingHeroAlt" class="landing-hero-image"
            width="1448" height="1086" loading="eager" decoding="async" fetchpriority="high" draggable="false"
          >
          <figcaption><span>Show up. Say something real.</span><span>Help the men beside you rise.</span></figcaption>
        </figure>
      </section>

      <section v-if="recentlyActiveMen.length && landingSnapshot" class="landing-shell landing-activity" aria-label="Community activity">
        <div class="landing-stats">
          <AppLandingStatBreakdown
            :title="`${landingSnapshot.stats.men.total.toLocaleString('en-US')} men`" :subtitle="menBreakdownTitle"
            :trigger-label="`${formatLandingCount(landingSnapshot.stats.men.total)}+ men — show breakdown`" :sections="menBreakdownSections"
          >
            <span class="landing-stat-value">{{ formatLandingCount(landingSnapshot.stats.men.total) }}+ <Icon name="tabler:arrow-up-right" aria-hidden="true" /></span>
            <span class="landing-stat-label">men</span>
          </AppLandingStatBreakdown>
          <AppLandingStatBreakdown
            :title="`${landingSnapshot.stats.posts.total.toLocaleString('en-US')} posts`" subtitle="Originals, replies, and audience"
            :trigger-label="`${formatLandingCount(landingSnapshot.stats.posts.total)}+ posts — show breakdown`" :sections="postsBreakdownSections"
          >
            <span class="landing-stat-value">{{ formatLandingCount(landingSnapshot.stats.posts.total) }}+ <Icon name="tabler:arrow-up-right" aria-hidden="true" /></span>
            <span class="landing-stat-label">posts</span>
          </AppLandingStatBreakdown>
          <AppLandingStatBreakdown
            v-if="landingSnapshot.stats.articles" :title="`${landingSnapshot.stats.articles.total.toLocaleString('en-US')} articles`" subtitle="Authorship and readership"
            :trigger-label="`${formatLandingCount(landingSnapshot.stats.articles.total)}+ articles — show breakdown`" :sections="articlesBreakdownSections"
          >
            <span class="landing-stat-value">{{ formatLandingCount(landingSnapshot.stats.articles.total) }}+ <Icon name="tabler:arrow-up-right" aria-hidden="true" /></span>
            <span class="landing-stat-label">articles</span>
          </AppLandingStatBreakdown>
          <AppLandingStatBreakdown
            v-if="landingSnapshot.stats.views" :title="`${landingSnapshot.stats.views.total.toLocaleString('en-US')} total views`" subtitle="Views across the community"
            :trigger-label="`${formatLandingCount(landingSnapshot.stats.views.total)}+ views — show breakdown`" :rows="viewsBreakdownRows"
          >
            <span class="landing-stat-value">{{ formatLandingCount(landingSnapshot.stats.views.total) }}+ <Icon name="tabler:arrow-up-right" aria-hidden="true" /></span>
            <span class="landing-stat-label">views</span>
          </AppLandingStatBreakdown>
        </div>
      </section>

      <section class="landing-shell landing-section landing-benefits" aria-labelledby="landing-benefits-heading">
        <h2 id="landing-benefits-heading" class="landing-eyebrow">A place to show up</h2>
        <div class="landing-feature-grid">
          <div v-for="feature in landingFeatures" :key="feature.title" class="landing-feature" :data-testid="feature.icon === 'spaces' ? 'landing-calls-card' : undefined">
            <AppIconGlyph :name="feature.icon" :selected="feature.selected" :size="28" />
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.body }}</p>
          </div>
        </div>
      </section>

      <section v-if="dailyQuote" class="landing-quote-band" aria-label="Daily quote">
        <figure class="landing-shell landing-quote">
          <p class="landing-eyebrow">A moment to think</p>
          <blockquote class="moh-serif">“{{ dailyQuote.text }}”</blockquote>
          <figcaption>{{ dailyQuoteAttribution }}<span v-if="dailyQuote.isParaphrase"> · paraphrase</span></figcaption>
        </figure>
      </section>

      <section class="landing-shell landing-section landing-how" aria-labelledby="landing-how-heading">
        <div class="landing-how-heading">
          <p class="landing-eyebrow">How it works</p>
          <h2 id="landing-how-heading">Simple. Focused. Effective.</h2>
        </div>
        <ol class="landing-steps">
          <li v-for="(step, index) in joiningSteps" :key="step.title">
            <span class="landing-step-number" aria-hidden="true">0{{ index + 1 }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.body }}</p>
          </li>
        </ol>
      </section>

      <section v-if="topPostsThisWeek.length > 0" class="landing-shell landing-section" aria-labelledby="landing-posts-heading">
        <div class="landing-section-heading">
          <div>
            <p class="landing-eyebrow">This week</p>
            <h2 id="landing-posts-heading">Public posts catching attention</h2>
            <p class="landing-section-description">Real conversations, ranked by recent public view activity.</p>
          </div>
          <NuxtLink to="/home" class="landing-text-link">Open public feed <Icon name="tabler:arrow-right" aria-hidden="true" /></NuxtLink>
        </div>
        <TransitionGroup name="landing-top-post" tag="div" class="landing-post-grid">
          <div
            v-for="(post, i) in featuredTopPosts" :key="post.id" :ref="(el) => setLandingPostCardEl(i, el)"
            class="landing-post-card" role="link" tabindex="0" :aria-label="`Read post by ${post.author.name || post.author.username || 'Member'}`"
            :style="{ '--landing-top-post-delay': `${i * 45}ms` }"
            @click="onLandingPostRowClick(postHref(post), $event)" @auxclick="onLandingPostRowAuxClick(postHref(post), $event)"
            @keydown.enter.self.prevent="navigateTo(postHref(post))" @keydown.space.self.prevent="navigateTo(postHref(post))"
          >
            <NuxtLink :to="postHref(post)" class="landing-post-overlay" tabindex="-1" aria-hidden="true" />
            <div class="landing-post-content">
              <div class="landing-post-author">
                <NuxtLink :to="authorHref(post)" :aria-label="`View @${post.author.username || 'member'} profile`" @click.stop>
                  <AppUserAvatar :user="post.author" size-class="h-10 w-10" bg-class="moh-surface" :enable-preview="false" />
                </NuxtLink>
                <div class="min-w-0">
                  <div class="landing-author-name">
                    <NuxtLink :to="authorHref(post)" class="truncate" @click.stop>{{ post.author.name || post.author.username || 'Member' }}</NuxtLink>
                    <AppVerifiedBadge v-if="post.author.verifiedStatus && post.author.verifiedStatus !== 'none'" :status="post.author.verifiedStatus" :premium="post.author.premium" :premium-plus="post.author.premiumPlus" :show-tooltip="false" />
                  </div>
                  <NuxtLink :to="authorHref(post)" class="landing-author-handle" @click.stop>@{{ post.author.username || 'member' }}</NuxtLink>
                </div>
              </div>
              <p v-if="post.parentId && post.parent?.author?.username" class="landing-reply-context">
                Replying to <span :class="userTierTextClass(userColorTier(post.parent.author), { fallback: 'moh-text-muted' })">@{{ post.parent.author.username }}</span>
              </p>
              <p class="landing-post-body">{{ post.body }}</p>
              <div class="landing-post-metrics">
                <span :aria-label="`${post.commentCount ?? 0} comments`"><AppIconGlyph name="reply" :size="16" />{{ formatLandingCount(post.commentCount ?? 0) }}</span>
                <span :aria-label="`${post.boostCount} boosts`"><AppIconGlyph name="boost" selected :size="16" />{{ formatLandingCount(post.boostCount) }}</span>
                <span :aria-label="`${post.weeklyViewCount || post.viewerCount || 0} views`"><AppIconGlyph name="visibility" :size="16" />{{ formatLandingCount(post.weeklyViewCount || post.viewerCount || 0) }}</span>
                <span class="landing-read-link">Read <Icon name="tabler:arrow-up-right" aria-hidden="true" /></span>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </section>

      <section v-if="landingArticlePreviews.length > 0" class="landing-shell landing-section landing-articles" aria-labelledby="landing-articles-heading">
        <div class="landing-articles-inner">
          <div class="landing-section-heading">
            <div><p class="landing-eyebrow">Read next</p><h2 id="landing-articles-heading">Articles worth opening</h2></div>
            <NuxtLink to="/articles?sort=trending" class="landing-text-link">See all <Icon name="tabler:arrow-right" aria-hidden="true" /></NuxtLink>
          </div>
          <div class="landing-article-grid">
            <NuxtLink v-for="article in landingArticlePreviews" :key="article.id" :to="`/a/${article.id}`" class="landing-article">
              <p class="landing-eyebrow">{{ article.readingTimeMinutes ? `${article.readingTimeMinutes} min read` : 'Article' }}</p>
              <h3>{{ article.title }}</h3>
              <p v-if="article.excerpt" class="landing-article-excerpt">{{ article.excerpt }}</p>
              <div class="landing-article-footer"><span>{{ article.author.name || article.author.username }}</span><span class="landing-read-link">Read <Icon name="tabler:arrow-up-right" aria-hidden="true" /></span></div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <section class="landing-merch-band" aria-labelledby="landing-merch-heading">
        <div class="landing-shell landing-merch">
          <div><p class="landing-eyebrow">Official merch</p><h2 id="landing-merch-heading">Wear what you stand for.</h2><p>Men of Hunger gear. Built for men who show up.</p></div>
          <Button as="a" href="https://merch.menofhunger.com" target="_blank" rel="noopener noreferrer" outlined rounded severity="secondary" class="landing-button">Shop now <Icon name="tabler:arrow-up-right" aria-hidden="true" /></Button>
        </div>
      </section>

      <section class="landing-shell landing-final" aria-labelledby="landing-final-heading">
        <h2 id="landing-final-heading">Stop scrolling. Start building.</h2>
        <p>Join men choosing real conversation over the noise.</p>
        <div class="landing-actions">
          <Button as="NuxtLink" to="/login" rounded class="landing-button">Join now</Button>
          <Button as="NuxtLink" to="/home" text rounded severity="secondary" class="landing-button">Explore the feed <Icon name="tabler:arrow-right" aria-hidden="true" /></Button>
        </div>
      </section>
    </div>

    <footer class="landing-shell landing-footer">
      <nav aria-label="Sitemap">
        <NuxtLink v-for="link in landingFooterLinks" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
        <a href="https://merch.menofhunger.com" target="_blank" rel="noopener noreferrer">Merch <Icon name="tabler:arrow-up-right" aria-hidden="true" /></a>
        <a :href="siteConfig.social.xUrl" target="_blank" rel="noopener noreferrer">Follow on X <Icon name="tabler:arrow-up-right" aria-hidden="true" /></a>
      </nav>
      <div class="landing-footer-bottom">
        <p>© {{ currentYear }} {{ siteConfig.name }}</p>
        <div class="landing-theme"><span>Theme</span><ClientOnly><AppThemeModeMenu /><template #fallback><span class="h-11 w-11" /></template></ClientOnly></div>
      </div>
    </footer>

    <Dialog id="landing-mobile-menu" v-model:visible="isMobileMenuOpen" modal dismissable-mask :draggable="false" header="Men of Hunger" :style="{ width: '390px', maxWidth: 'calc(100vw - 32px)' }">
      <nav class="landing-menu-links" aria-label="Mobile navigation">
        <Button as="NuxtLink" to="/login" rounded class="landing-button" @click="isMobileMenuOpen = false">Join now</Button>
        <NuxtLink to="/login" @click="isMobileMenuOpen = false">Log in</NuxtLink>
        <NuxtLink to="/home" @click="isMobileMenuOpen = false">Explore the feed <Icon name="tabler:arrow-right" aria-hidden="true" /></NuxtLink>
        <NuxtLink v-for="link in landingNavLinks" :key="link.to" :to="link.to" @click="isMobileMenuOpen = false">{{ link.label }}</NuxtLink>
        <a href="https://merch.menofhunger.com" target="_blank" rel="noopener noreferrer" @click="isMobileMenuOpen = false">Merch <Icon name="tabler:arrow-up-right" aria-hidden="true" /></a>
      </nav>
    </Dialog>
    <!-- Roanoke bottom sheet (teleported) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isRoanokeOpen"
          class="fixed inset-0 z-[100] bg-black/50"
          role="presentation"
          @click="isRoanokeOpen = false"
        />
      </Transition>

      <Transition
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition-transform duration-150 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div
          v-if="isRoanokeOpen"
          class="fixed inset-x-0 bottom-0 z-[101] flex justify-center px-3 pb-[var(--moh-safe-bottom,0px)]"
          role="dialog"
          aria-modal="true"
          aria-label="Roanoke meetup"
          @click="isRoanokeOpen = false"
        >
          <div
            class="w-full max-w-xl rounded-t-2xl border border-orange-200/70 bg-orange-50/60 shadow-2xl dark:border-orange-500/20 dark:bg-orange-500/10"
            @click.stop
          >
            <div class="flex items-center justify-between px-5 py-4">
              <div class="flex items-center gap-3">
                <AppLogo
                  :alt="siteConfig.name"
                  :width="32"
                  :height="32"
                  img-class="h-8 w-8 rounded"
                />
                <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Men of Hunger: Roanoke
                </div>
              </div>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-white/70 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-950/40 dark:hover:text-gray-50"
                aria-label="Close"
                @click="isRoanokeOpen = false"
              >
                <Icon name="tabler:x" aria-hidden="true" />
              </button>
            </div>

            <div class="max-h-[75vh] overflow-y-auto no-scrollbar px-5 pb-6">
              <div class="space-y-4 pb-2">
                <div class="space-y-2">
                  <p class="text-sm text-gray-800 dark:text-gray-100">
                    Men of Hunger is a community for men who want real conversation and accountability — online and in person.
                    We meet to think clearly, speak honestly, and help one another move our missions forward.
                  </p>
                  <p class="text-sm text-gray-800 dark:text-gray-100">
                    Events range from open discussions (like <span class="font-medium">Estuary</span>) to learning sessions, service projects, and accountability groups.
                  </p>
                </div>

                <div class="flex flex-col gap-2">
                  <a :href="roanokeMeetupUrl" target="_blank" rel="noopener noreferrer" class="inline-flex w-full">
                    <Button class="w-full rounded-full">
                      <span class="flex w-full items-center justify-center gap-2">
                        <span>Open on meetup.com</span>
                        <Icon name="tabler:external-link" class="opacity-80" aria-hidden="true" />
                      </span>
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { userColorTier, userTierTextClass } from '~/utils/user-tier'
import { siteConfig } from '~/config/site'
import { VOICE } from '~/config/voice'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'
import { avatarRoundClass } from '~/utils/avatar-rounding'
import type { BreakdownRow, BreakdownSection } from '~/components/app/LandingStatBreakdown.vue'
import type { DailyContentToday, DailyQuote, LandingSnapshot, LandingTopPost } from '~/types/api'

definePageMeta({
  layout: 'empty'
})

useHead({
  htmlAttrs: { class: 'moh-landing' }
})

const roanokeMeetupUrl = siteConfig.social.meetup
const currentYear = new Date().getUTCFullYear()
const isRoanokeOpen = ref(false)
const isMobileMenuOpen = ref(false)
useOverlayDismiss(isMobileMenuOpen, () => { isMobileMenuOpen.value = false })

const landingFeatures = [
  { icon: 'verified', selected: true, title: 'Verified members', body: 'Trust comes first. Every member is verified.' },
  { icon: 'checkin', selected: false, title: 'Daily check-ins', body: 'Simple daily prompts keep you consistent.' },
  { icon: 'premium', selected: false, title: 'Premium groups', body: 'Smaller groups for deeper conversations.' },
  { icon: 'spaces', selected: false, title: 'Voice & video calls', body: 'Peer-to-peer encrypted. Calls travel directly between devices — our servers only help you connect and never see or store them.' },
] as const
const joiningSteps = [
  { title: 'Join', body: 'Verify and create your profile.' },
  { title: 'Engage', body: 'Post, reply, and check in every day.' },
  { title: 'Grow', body: 'Stay accountable. It compounds.' },
]
const landingNavLinks = [
  { label: 'About', to: '/about' },
  { label: 'Roadmap', to: '/roadmap' },
  { label: 'Articles', to: '/articles' },
]
const landingFooterLinks = [
  { label: 'About', to: '/about' },
  { label: 'Tiers', to: '/tiers' },
  { label: 'Articles', to: '/articles' },
  { label: 'Roadmap', to: '/roadmap' },
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

const {
  data: dailyContent,
  refresh: refreshDailyContent,
} = await useAsyncData<DailyContentToday>(
  'landing:daily-content:today',
  () => apiFetchData<DailyContentToday>('/meta/daily-content/today', { method: 'GET' }),
  { server: true },
)
const dailyQuote = computed<DailyQuote | null>(() => dailyContent.value?.quote ?? null)
const dailyQuoteAttribution = computed(() => (dailyQuote.value ? formatDailyQuoteAttribution(dailyQuote.value) : ''))

// Refresh when the next publish boundary (9:00am ET for word, 9:30am ET for quote) is crossed.
const { scheduleFromNextPublishAt: scheduleLandingRefresh } = usePublishBoundaryRollover(() => refreshDailyContent())

if (import.meta.client) {
  watch(
    () => dailyContent.value?.nextPublishAt ?? null,
    (nextPublishAt) => scheduleLandingRefresh(nextPublishAt),
    { immediate: true },
  )
}

const { data: landingSnapshotData } = await useAsyncData<LandingSnapshot>(
  'landing:snapshot',
  () => apiFetchData<LandingSnapshot>('/meta/landing', { method: 'GET' }),
  { server: true },
)
const landingSnapshot = computed(() => landingSnapshotData.value ?? null)
const recentlyActiveMen = computed(() => landingSnapshot.value?.recentlyActiveMen ?? [])
const topPostsThisWeek = computed(() => landingSnapshot.value?.topPostsThisWeek ?? [])
const trendingArticles = computed(() => landingSnapshot.value?.trendingArticles ?? [])
const landingArticlePreviews = computed(() => trendingArticles.value.slice(0, 3))

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
  return new Intl.NumberFormat('en-US', { notation: value >= 1_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}

const menBreakdownTitle = computed(() => {
  const s = landingSnapshot.value?.stats.men
  if (!s) return 'verified men'
  const contributors = Math.min(Math.max(0, s.contributors ?? 0), s.total)
  return `${contributors.toLocaleString('en-US')} of ${s.total.toLocaleString('en-US')} have posted`
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
      { key: 'authors', label: 'Authors', count: s.authors ?? 0 },
      { key: 'views', label: 'Total views', count: s.views ?? 0 },
      { key: 'unique', label: 'Unique views', count: s.unique ?? 0 },
    ],
    [
      { key: 'public', label: 'Public', count: s.public, dotClass: 'bg-gray-400' },
      { key: 'verified', label: 'Verified', count: s.verified, dotClass: 'bg-blue-400' },
      { key: 'premium', label: 'Premium', count: s.premium, dotClass: 'bg-yellow-400' },
    ],
  ]
})

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

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(el.closest('a,button,iframe,input,textarea,select,[role="menu"],[role="menuitem"],[data-pc-section]'))
}

function onLandingPostRowClick(href: string, e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(href, '_blank')
    return
  }
  void navigateTo(href)
}

function onLandingPostRowAuxClick(href: string, e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(href, '_blank')
}

usePageSeo({
  title: siteConfig.meta.title,
  description: siteConfig.meta.description,
  canonicalPath: '/',
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>

<style scoped>
.landing-page { position: relative; width: 100%; min-height: 100%; background: var(--moh-surface-0); color: var(--moh-text); }
.landing-shell { width: 100%; max-width: 1440px; margin-inline: auto; padding-inline: 80px; }
.landing-nav { display: flex; align-items: center; gap: 32px; padding-block: 24px; }
.landing-brand { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; font-size: 14px; font-weight: 700; text-transform: uppercase; }
.landing-brand :deep(.landing-logo) { width: 40px; height: 40px !important; }
.landing-desktop-links { display: flex; align-items: center; justify-content: center; gap: 28px; flex: 1; color: var(--moh-text-muted); font-size: 14px; font-weight: 500; }
.landing-desktop-links a, .landing-footer a { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; }
.landing-desktop-actions { display: flex; gap: 12px; }
.landing-button { min-height: 46px; padding: 12px 20px; font-size: 15px; font-weight: 600; line-height: 22px; }
.landing-mobile-toggle { display: none; }
.landing-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 64px; align-items: center; padding-top: 48px; padding-bottom: 64px; }
.landing-intro { display: flex; flex-direction: column; align-items: flex-start; gap: 28px; min-width: 0; }
.landing-eyebrow { color: var(--moh-text-muted); font-size: 12px; font-weight: 600; line-height: 1.45; text-transform: uppercase; }
.landing-trust { display: flex; align-items: center; gap: 8px; }
.landing-intro h1 { font-size: 58px; font-weight: 700; letter-spacing: -.04em; line-height: 1.08; }
.landing-intro h1 span { color: var(--moh-brass); }
.landing-description { max-width: 535px; font-size: 18px; line-height: 1.45; color: var(--moh-text-muted); }
.landing-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.landing-social-proof { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 16px; font-size: 13px; font-weight: 500; color: var(--moh-text-muted); }
.landing-avatars { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.landing-avatars > a { display: flex; align-items: center; justify-content: center; min-width: 32px; min-height: 44px; transition: transform 150ms ease; }
.landing-avatars > a:hover { transform: translateY(-2px); }
.landing-photography { min-width: 0; }
.landing-hero-image { display: block; width: 100%; aspect-ratio: 608 / 560; object-fit: cover; border-radius: 12px; }
.landing-photography figcaption { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 12px; font-size: 11px; font-weight: 600; line-height: 1.45; color: var(--moh-text-muted); text-transform: uppercase; }
.landing-activity { padding-bottom: 40px; }
.landing-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 32px; padding-block: 24px; border-block: 1px solid var(--moh-border); }
.landing-stat-value { display: flex; align-items: center; gap: 12px; font-size: 36px; font-weight: 600; line-height: 1.45; font-variant-numeric: tabular-nums; }
.landing-stat-value :deep(.iconify) { width: 18px; height: 18px; color: var(--moh-text-muted); }
.landing-stat-label { color: var(--moh-text-muted); font-size: 14px; font-weight: 500; }
.landing-section { padding-top: 40px; padding-bottom: 64px; }
.landing-feature-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 32px; margin-top: 32px; }
.landing-feature { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
.landing-feature h3 { font-size: 20px; font-weight: 600; line-height: 1.45; }
.landing-feature p { color: var(--moh-text-muted); font-size: 15px; line-height: 1.45; }
.landing-quote-band, .landing-merch-band { background: var(--moh-surface-1); }
.landing-quote { display: flex; flex-direction: column; align-items: center; gap: 24px; padding-block: 64px; text-align: center; }
.landing-quote .landing-eyebrow { font-size: 11px; }
.landing-quote blockquote { max-width: 890px; font-size: 32px; line-height: 1.45; }
.landing-quote figcaption { font-size: 13px; font-weight: 500; color: var(--moh-text-muted); }
.landing-how { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 80px; padding-block: 80px; }
.landing-how-heading h2 { margin-top: 12px; font-size: 36px; font-weight: 700; line-height: 1.08; }
.landing-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
.landing-step-number { display: block; color: var(--moh-brass); font-size: 13px; font-weight: 600; padding-bottom: 16px; border-bottom: 1px solid var(--moh-border); }
.landing-steps h3 { margin-top: 16px; font-size: 24px; font-weight: 600; }
.landing-steps p { margin-top: 16px; color: var(--moh-text-muted); font-size: 16px; line-height: 1.45; }
.landing-section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; margin-bottom: 28px; }
.landing-section-heading h2 { margin-top: 8px; font-size: 32px; font-weight: 700; line-height: 1.45; }
.landing-section-description { margin-top: 8px; color: var(--moh-text-muted); font-size: 16px; line-height: 1.45; }
.landing-text-link { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; flex-shrink: 0; font-size: 15px; font-weight: 600; }
.landing-post-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; gap: 24px; position: relative; }
.landing-post-card { position: relative; min-width: 0; border-radius: 12px; background: var(--moh-surface-1); cursor: pointer; transition: background-color 150ms ease; }
.landing-post-card:hover { background: var(--moh-surface-hover); }
.landing-post-overlay { position: absolute; inset: 0; z-index: 1; border-radius: inherit; }
.landing-post-content { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 16px; padding: 24px; }
.landing-post-author { display: flex; align-items: center; gap: 12px; }
.landing-post-author > a { flex-shrink: 0; }
.landing-author-name { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; }
.landing-author-handle { display: block; font-size: 13px; color: var(--moh-text-muted); overflow-wrap: anywhere; }
.landing-reply-context { color: var(--moh-text-muted); font-size: 12px; line-height: 1.45; }
.landing-post-body { white-space: pre-line; overflow-wrap: anywhere; font-size: 16px; line-height: 1.5; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 6; overflow: hidden; }
.landing-post-metrics { display: flex; align-items: center; gap: 24px; color: var(--moh-text-muted); font-size: 13px; font-variant-numeric: tabular-nums; }
.landing-post-metrics > span, .landing-read-link { display: inline-flex; align-items: center; gap: 6px; }
.landing-read-link { color: var(--moh-text); font-weight: 600; white-space: nowrap; }
.landing-post-metrics > .landing-read-link { margin-left: auto; }
.landing-articles-inner { padding-top: 28px; border-top: 1px solid var(--moh-border); }
.landing-article-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; }
.landing-article { display: flex; min-width: 0; flex-direction: column; gap: 16px; border-radius: 4px; }
.landing-article h3 { font-size: 24px; font-weight: 600; line-height: 1.45; overflow-wrap: anywhere; }
.landing-article-excerpt { color: var(--moh-text-muted); font-size: 15px; line-height: 1.45; }
.landing-article-footer { display: flex; gap: 24px; color: var(--moh-text-muted); font-size: 13px; font-weight: 500; }
.landing-article:hover h3 { text-decoration: underline; text-underline-offset: 4px; }
.landing-merch { display: flex; align-items: center; justify-content: space-between; gap: 40px; padding-block: 40px; }
.landing-merch h2 { margin-top: 8px; font-size: 28px; font-weight: 700; line-height: 1.45; }
.landing-merch h2 + p { margin-top: 8px; color: var(--moh-text-muted); font-size: 15px; line-height: 1.45; }
.landing-merch > .landing-button { flex-shrink: 0; }
.landing-final { display: flex; flex-direction: column; align-items: center; gap: 24px; padding-block: 80px; text-align: center; }
.landing-final h2 { font-size: 44px; font-weight: 700; letter-spacing: -.02em; line-height: 1.08; }
.landing-final p { color: var(--moh-text-muted); font-size: 18px; line-height: 1.45; }
.landing-final .landing-actions { justify-content: center; }
.landing-footer { padding-top: 32px; padding-bottom: 32px; color: var(--moh-text-muted); }
.landing-footer nav { display: flex; flex-wrap: wrap; gap: 0 28px; padding-top: 12px; border-top: 1px solid var(--moh-border); font-size: 13px; font-weight: 500; }
.landing-footer-bottom { display: flex; align-items: center; gap: 40px; margin-top: 12px; font-size: 12px; }
.landing-theme { display: flex; align-items: center; gap: 4px; }
.landing-menu-links { display: flex; flex-direction: column; gap: 8px; }
.landing-menu-links > a { display: flex; align-items: center; gap: 8px; min-height: 46px; padding: 12px 20px; font-size: 15px; font-weight: 500; border-radius: 999px; }
.landing-page a:focus-visible, .landing-post-card:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 4px; }
.landing-desktop-links a:hover, .landing-footer a:hover, .landing-text-link:hover, .landing-author-name a:hover { color: var(--moh-text); text-decoration: underline; text-underline-offset: 4px; }
.landing-top-post-move { transition: transform 280ms cubic-bezier(.2,0,0,1); }
.landing-top-post-enter-active, .landing-top-post-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.landing-top-post-enter-active { transition-delay: var(--landing-top-post-delay, 0ms); }
.landing-top-post-leave-active { position: absolute; }
.landing-top-post-enter-from, .landing-top-post-leave-to { opacity: 0; transform: translateY(8px); }
@media (max-width: 1199px) {
  .landing-shell { padding-inline: 40px; }
  .landing-hero { gap: 40px; }
  .landing-intro h1 { font-size: 48px; }
  .landing-how { grid-template-columns: 280px minmax(0, 1fr); gap: 40px; }
  .landing-post-content { padding: 20px; }
  .landing-post-metrics { gap: 16px; }
}
@media (max-width: 959px) {
  .landing-desktop-links, .landing-desktop-actions { display: none; }
  .landing-mobile-toggle { display: inline-flex; margin-left: auto; }
  .landing-nav { justify-content: space-between; gap: 16px; }
  .landing-hero { grid-template-columns: minmax(0, 1fr); gap: 32px; }
  .landing-intro h1 { max-width: 700px; }
  .landing-hero-image { max-height: 560px; }
  .landing-stats, .landing-feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .landing-how { grid-template-columns: 1fr; gap: 32px; }
  .landing-post-grid, .landing-article-grid { grid-template-columns: minmax(0, 1fr); gap: 24px; }
}
@media (max-width: 599px) {
  .landing-shell { padding-inline: 24px; }
  .landing-brand { gap: 8px; font-size: 12px; }
  .landing-brand :deep(.landing-logo) { width: 32px; height: 32px !important; }
  .landing-hero { padding-top: 24px; padding-bottom: 40px; }
  .landing-intro h1 { font-size: 40px; letter-spacing: -.03em; }
  .landing-description { font-size: 16px; }
  .landing-actions { gap: 8px; }
  .landing-social-proof { flex-direction: column; align-items: flex-start; }
  .landing-hero-image { aspect-ratio: 342 / 320; }
  .landing-photography figcaption { flex-direction: column; font-size: 10px; }
  .landing-activity { padding-bottom: 32px; }
  .landing-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; padding-block: 20px; }
  .landing-stat-value { font-size: 28px; }
  .landing-section { padding-block: 40px; }
  .landing-benefits { padding-top: 32px; }
  .landing-feature-grid { grid-template-columns: 1fr; }
  .landing-quote { padding-block: 40px; }
  .landing-quote blockquote { font-size: 26px; }
  .landing-how-heading h2 { font-size: 30px; }
  .landing-steps { grid-template-columns: 1fr; }
  .landing-section-heading { flex-direction: column; gap: 16px; }
  .landing-section-heading h2 { font-size: 28px; }
  .landing-post-grid { gap: 16px; }
  .landing-article-grid { gap: 32px; }
  .landing-merch { flex-direction: column; align-items: flex-start; gap: 24px; }
  .landing-final { padding-block: 40px; }
  .landing-final h2 { font-size: 32px; }
  .landing-final p { font-size: 16px; }
  .landing-footer { padding-block: 40px; }
  .landing-footer nav { column-gap: 24px; }
}
@media (prefers-reduced-motion: reduce) {
  .landing-avatars > a, .landing-post-card, .landing-top-post-move, .landing-top-post-enter-active, .landing-top-post-leave-active { transition: none; }
}
</style>
