<template>
  <!-- Two scrollers:
       - Left rail (independent, only scrolls when pointer is over it)
       - Main scroller (center + right share scroll) -->
  <ClientOnly>
    <AppToastStack />
  </ClientOnly>
  <AppOnboardingGate />
  <AppAuthActionModal />
  <div class="h-dvh overflow-hidden moh-bg moh-text">
    <div class="mx-auto flex h-full w-full max-w-6xl px-2 sm:px-4 xl:max-w-7xl">
      <!-- Left Nav (independent scroll) -->
      <aside class="no-scrollbar hidden sm:block shrink-0 h-full overflow-y-auto overscroll-y-auto border-r moh-border">
        <!-- IMPORTANT: no `h-full` + no `overflow-hidden` here, or the rail can't actually scroll -->
        <div
          :class="[
            // Keep internal layout stable; only width changes between compact and wide.
            'min-h-full w-14 px-1 py-4 transition-[width,padding] duration-200 ease-out flex flex-col',
            // On desktop, match the right rail's padding (`px-4`) in both modes.
            // When compact, increase rail width so the inner content can still fit `w-12`,
            // while keeping the same right gutter to the divider as wide mode.
            // Prefer: left collapses (xl) before right rail hides (lg).
            navCompactMode ? 'md:w-20 md:px-4' : 'md:w-20 md:px-4 xl:w-64 xl:px-4'
          ]"
        >
          <div class="mb-3">
            <div class="flex h-12 w-12 items-center justify-center">
              <AppLogo
                :alt="siteConfig.name"
                as-link
                to="/home"
                :light-src="logoLightSmall"
                :dark-src="logoDarkSmall"
                :width="32"
                :height="32"
                imgClass="h-8 w-8 rounded"
              />
            </div>
          </div>

          <nav class="space-y-1 flex-1">
            <NuxtLink
              v-for="item in leftNavItems"
              :key="item.label"
              :to="item.to"
              :class="[
                // NOTE: Don't use `moh-text` here; it overrides per-item color accents (e.g. Only me).
                'group flex h-12 items-center rounded-xl transition-colors',
                'w-full',
                route.path === item.to ? 'moh-surface font-semibold' : 'font-semibold',
                // Default nav tone
                item.key !== 'only-me' ? 'text-gray-900 dark:text-gray-100 moh-surface-hover' : '',
                item.key === 'only-me'
                  ? (route.path === item.to
                      ? 'bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-200 dark:hover:bg-violet-500/25'
                      : 'text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-500/20')
                  : ''
              ]"
              @click="(e) => onLeftNavClick(item.to, e)"
            >
              <span class="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <i :class="['pi text-[28px] font-semibold', item.icon]" aria-hidden="true" />
                <span
                  v-if="item.key === 'notifications' && notifBadge.show"
                  class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center shadow-sm ring-2 ring-white dark:ring-black"
                  :class="notifBadge.toneClass"
                >
                  {{ notifBadge.count }}
                </span>
              </span>
              <span v-if="!navCompactMode" class="hidden xl:inline whitespace-nowrap overflow-hidden text-xl font-semibold max-w-[220px]">
                {{ item.label }}
              </span>
            </NuxtLink>

            <div class="pt-2">
              <button
                type="button"
                aria-label="Post"
                :class="[
                  'group flex h-12 items-center rounded-xl bg-black text-white hover:opacity-95 dark:bg-white dark:text-black',
                  'w-full'
                ]"
                v-if="isAuthed"
              >
                <span class="flex h-12 w-12 shrink-0 items-center justify-center">
                  <i class="pi pi-plus text-3xl" aria-hidden="true" />
                </span>
                <span v-if="!navCompactMode" class="hidden xl:inline text-base font-semibold">Post</span>
              </button>
            </div>

          </nav>

          <AppUserCard v-if="isAuthed" :compact="navCompactMode" />
        </div>
      </aside>

      <!-- Columns 2 + 3: separate scroll zones, but coupled wheel scrolling. -->
      <div class="flex min-w-0 flex-1">
        <!-- Middle / Feed (scroll zone #2) -->
        <main
          ref="middleScrollerEl"
          class="no-scrollbar min-w-0 flex-1 overflow-y-auto overscroll-y-auto lg:border-r moh-border"
        >
          <div
            v-if="!hideTopBar"
            class="sticky top-0 z-10 border-b moh-border moh-frosted"
          >
            <div class="px-4 py-3 flex items-center justify-between gap-3">
              <div class="min-w-0 flex items-center gap-2">
                <h1 class="min-w-0 truncate text-xl font-bold tracking-tight">
                  {{ headerTitle }}
                </h1>
                <AppVerifiedBadge
                  v-if="appHeader?.verifiedStatus"
                  :status="appHeader.verifiedStatus"
                  :premium="Boolean(appHeader?.premium)"
                />
              </div>
              <div v-if="typeof appHeader?.postCount === 'number'" class="shrink-0 text-sm moh-text-muted">
                <span class="font-semibold tabular-nums">{{ formatCompactNumber(appHeader.postCount) }}</span>
                <span class="ml-1">posts</span>
              </div>
            </div>
          </div>

          <div :class="hideTopBar ? 'pb-24 sm:pb-4' : 'px-4 py-4 pb-24 sm:pb-4'">
            <slot />
          </div>
        </main>

        <!-- Right rail (scroll zone #3). Visible on lg+. -->
        <aside
          ref="rightScrollerEl"
          :class="[
            'no-scrollbar shrink-0 w-80 h-full overflow-y-auto overscroll-y-auto px-4 py-4',
            isRightRailForcedHidden ? 'hidden' : 'hidden lg:block'
          ]"
        >
          <div>
            <!-- On Explore, the search bar lives in the center column. Collapse it here. -->
            <div
              :class="[
                'overflow-hidden transition-all duration-200 ease-out',
                isRightRailSearchHidden ? 'max-h-0 opacity-0 mb-0 pointer-events-none' : 'max-h-16 opacity-100 mb-4'
              ]"
            >
              <InputText class="w-full" placeholder="Search…" />
            </div>

            <div class="space-y-4 transition-[transform] duration-200 ease-out">
              <Card>
                <template #title>Trends for you</template>
                <template #content>
                  <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div class="space-y-1">
                      <div class="text-xs text-gray-500 dark:text-gray-400">Trending</div>
                      <div class="font-semibold">Discipline</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">12.4K posts</div>
                    </div>
                    <div class="space-y-1">
                      <div class="text-xs text-gray-500 dark:text-gray-400">Trending in Fitness</div>
                      <div class="font-semibold">Cold plunge</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">3,219 posts</div>
                    </div>
                    <div class="space-y-1">
                      <div class="text-xs text-gray-500 dark:text-gray-400">Trending</div>
                      <div class="font-semibold">Brotherhood</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">8,002 posts</div>
                    </div>
                    <Button label="Show more" text severity="secondary" class="w-full justify-center" />
                  </div>
                </template>
              </Card>

              <Card>
                <template #title>What’s happening</template>
                <template #content>
                  <div class="space-y-3 text-sm moh-text-muted">
                    <div class="rounded-lg border moh-border p-3">
                      Placeholder card (could be announcements, promos, ads, etc.)
                    </div>
                    <div class="rounded-lg border moh-border p-3">
                      Another placeholder card
                    </div>
                  </div>
                </template>
              </Card>

              <Card>
                <template #title>Suggestions</template>
                <template #content>
                  <div class="space-y-3 text-sm moh-text-muted">
                    <div class="flex items-center justify-between">
                      <div class="min-w-0">
                        <div class="font-medium">Men of Hunger</div>
                        <div class="moh-text-muted">@menofhunger</div>
                      </div>
                      <Button label="Follow" severity="secondary" size="small" />
                    </div>
                  </div>
                </template>
              </Card>

              <Card>
                <template #title>Who to follow</template>
                <template #content>
                  <div class="space-y-4 text-sm moh-text-muted">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-10 w-10 rounded-full moh-surface" aria-hidden="true" />
                        <div class="min-w-0">
                          <div class="font-semibold truncate">Builder Weekly</div>
                          <div class="moh-text-muted truncate">@builderweekly</div>
                        </div>
                      </div>
                      <Button label="Follow" severity="secondary" size="small" />
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-10 w-10 rounded-full moh-surface" aria-hidden="true" />
                        <div class="min-w-0">
                          <div class="font-semibold truncate">Strength Log</div>
                          <div class="moh-text-muted truncate">@strengthlog</div>
                        </div>
                      </div>
                      <Button label="Follow" severity="secondary" size="small" />
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-10 w-10 rounded-full moh-surface" aria-hidden="true" />
                        <div class="min-w-0">
                          <div class="font-semibold truncate">Men’s Groups</div>
                          <div class="moh-text-muted truncate">@mensgroups</div>
                        </div>
                      </div>
                      <Button label="Follow" severity="secondary" size="small" />
                    </div>
                    <Button label="Show more" text severity="secondary" class="w-full justify-center" />
                  </div>
                </template>
              </Card>

              <Card>
                <template #title>Groups</template>
                <template #content>
                  <div class="space-y-3 text-sm moh-text-muted">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-semibold">Daily Discipline</div>
                        <div class="text-xs moh-text-muted">14 members · 3 new posts</div>
                      </div>
                      <Tag value="New" severity="success" />
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-semibold">Business Builders</div>
                        <div class="text-xs moh-text-muted">62 members · 1 new post</div>
                      </div>
                      <Tag value="Active" severity="info" />
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-semibold">Strength & Conditioning</div>
                        <div class="text-xs moh-text-muted">28 members · 0 new posts</div>
                      </div>
                      <Tag value="Open" severity="secondary" />
                    </div>
                    <Button label="Browse groups" text severity="secondary" class="w-full justify-center" />
                  </div>
                </template>
              </Card>

              <Card>
                <template #title>Sponsored</template>
                <template #content>
                  <div class="space-y-3 text-sm moh-text-muted">
                    <div class="rounded-lg border moh-border p-3">
                      <div class="flex items-center justify-between">
                        <div class="font-semibold">Ad slot</div>
                        <Tag value="Ad" severity="secondary" />
                      </div>
                      <p class="mt-2 moh-text-muted">
                        Placeholder for a promoted card. Could be a course, sponsor, or affiliate link.
                      </p>
                      <Button label="Learn more" class="mt-3 w-full rounded-full" severity="secondary" />
                    </div>
                  </div>
                </template>
              </Card>

              <div class="px-2 text-xs moh-text-muted space-x-2">
                <NuxtLink to="/about" class="hover:underline">About</NuxtLink>
                <span>·</span>
                <NuxtLink to="/privacy" class="hover:underline">Privacy</NuxtLink>
                <span>·</span>
                <NuxtLink to="/terms" class="hover:underline">Terms</NuxtLink>
                <span>·</span>
                <span>&copy; {{ new Date().getFullYear() }} {{ siteConfig.name }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>

  <AppTabBar :items="tabItems" />

  <AppImageLightbox
    :visible="lightbox.visible.value"
    :backdrop-visible="lightbox.backdropVisible.value"
    :src="lightbox.src.value"
    :alt="lightbox.alt.value"
    :kind="lightbox.kind.value"
    :media-phase="lightbox.mediaPhase.value"
    :target="lightbox.target.value"
    :image-style="lightbox.imageStyle.value"
    :show-nav="lightbox.kind.value === 'media' && (lightbox.items.value?.length ?? 0) > 1"
    :can-prev="lightbox.canPrev.value"
    :can-next="lightbox.canNext.value"
    :counter-label="
      lightbox.kind.value === 'media' && (lightbox.items.value?.length ?? 0) > 1
        ? `${lightbox.index.value + 1} / ${lightbox.items.value.length}`
        : null
    "
    :on-prev="lightbox.prev"
    :on-next="lightbox.next"
    :on-close="lightbox.close"
    :on-transition-end="lightbox.onTransitionEnd"
  />
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import logoLightSmall from '~/assets/images/logo-white-bg-small.png'
import logoDarkSmall from '~/assets/images/logo-black-bg-small.png'
import { primaryTintCssForUser } from '~/utils/theme-tint'

const route = useRoute()
const { initAuth, user } = useAuth()
const { isAuthed, leftItems: leftNavItems, tabItems } = useAppNav()
const { hideTopBar, navCompactMode, isRightRailForcedHidden, isRightRailSearchHidden, title } = useLayoutRules(route)
const { header: appHeader } = useAppHeader()
const notifBadge = useNotificationsBadge()

const headerTitle = computed(() => {
  const t = (appHeader.value?.title ?? '').trim()
  return t || title.value
})

function formatCompactNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  } catch {
    return String(n)
  }
}

// Centralized auth hydration lives in `useAuth()`.
await initAuth()
// nav items are provided by useAppNav() so mobile + desktop stay in sync

// Dynamic theme tint: default (orange) for logged out/unverified, verified = blue, premium = orange.
// We override PrimeVue semantic primary tokens via CSS variables so the entire UI tint follows status.
const primaryCssVars = computed(() => primaryTintCssForUser(user.value ?? null))
useHead({
  style: [{ key: 'moh-primary-tint', textContent: primaryCssVars }],
})

const middleScrollerEl = ref<HTMLElement | null>(null)
const rightScrollerEl = ref<HTMLElement | null>(null)

useCoupledScroll({
  middle: middleScrollerEl,
  right: rightScrollerEl,
  enabled: computed(() => !isRightRailForcedHidden.value)
})

const lightbox = useImageLightbox()

function isActiveNav(to: string) {
  if (to === '/home') return route.path === '/home'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function scrollMiddleToTop() {
  const el = middleScrollerEl.value
  if (!el) return
  el.scrollTo({ top: 0, behavior: 'smooth' })
}

function onLeftNavClick(to: string, e: MouseEvent) {
  if (!isActiveNav(to)) return
  e.preventDefault()
  e.stopPropagation()
  scrollMiddleToTop()
}

function onScrollTopEvent(e: Event) {
  const to = (e as CustomEvent<{ to?: string }>).detail?.to ?? null
  if (to && !isActiveNav(to)) return
  scrollMiddleToTop()
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('moh-scroll-top', onScrollTopEvent as EventListener)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('moh-scroll-top', onScrollTopEvent as EventListener)
})
</script>

