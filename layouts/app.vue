<template>
  <!-- Two scrollers:
       - Left rail (independent, only scrolls when pointer is over it)
       - Main scroller (center + right share scroll) -->
  <div class="h-dvh overflow-hidden bg-white text-gray-900 dark:bg-black dark:text-gray-50">
    <div class="mx-auto flex h-full w-full max-w-6xl px-2 sm:px-4 xl:max-w-7xl">
      <!-- Left Nav (independent scroll) -->
      <aside class="no-scrollbar shrink-0 h-full overflow-y-auto overscroll-y-none border-r border-gray-200 dark:border-zinc-800">
        <!-- IMPORTANT: no `h-full` + no `overflow-hidden` here, or the rail can't actually scroll -->
        <div class="min-h-full w-14 px-1 py-4 transition-[width,padding] duration-200 ease-out md:w-64 md:px-3">
          <div class="mb-3 flex items-center justify-center md:justify-start">
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

          <nav class="space-y-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              :class="[
                'group mx-auto flex h-12 w-12 items-center justify-center gap-0 rounded-xl text-gray-900 hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-zinc-900 md:mx-0 md:h-auto md:w-full md:justify-start md:gap-4 md:rounded-full md:px-4 md:py-3',
                route.path === item.to ? 'bg-gray-100 font-semibold dark:bg-zinc-900' : 'font-medium'
              ]"
            >
              <i class="pi text-2xl md:text-xl" :class="item.icon" aria-hidden="true" />
              <span
                class="whitespace-nowrap overflow-hidden text-xl md:text-lg transition-[max-width,opacity] duration-200 ease-out max-w-0 opacity-0 md:max-w-[220px] md:opacity-100"
              >
                {{ item.label }}
              </span>
            </NuxtLink>

            <div class="pt-2">
              <Button
                label="Post"
                icon="pi pi-plus"
                aria-label="Post"
                class="mx-auto h-12 w-12 rounded-xl !border-0 !p-0 !shadow-none !bg-black !text-white dark:!bg-white dark:!text-black
                       [&_.p-button-label]:hidden md:[&_.p-button-label]:inline
                       md:[&_.p-button-icon]:hidden
                       md:mx-0 md:h-auto md:w-full md:rounded-full md:!px-4 md:!py-3"
              />
            </div>

            <div class="pt-3 flex items-center justify-center md:justify-start md:px-2">
              <ClientOnly>
                <AppThemeModeMenu />
              </ClientOnly>
            </div>
          </nav>
        </div>
      </aside>

      <!-- Columns 2 + 3: separate scroll zones, but coupled wheel scrolling. -->
      <div class="flex min-w-0 flex-1">
        <!-- Middle / Feed (scroll zone #2) -->
        <main
          ref="middleScrollerEl"
          class="no-scrollbar min-w-0 flex-1 overflow-y-auto overscroll-y-none border-r border-gray-200 dark:border-zinc-800"
        >
          <div class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
            <div class="px-4 py-3">
              <h1 class="text-xl font-bold tracking-tight">{{ title }}</h1>
            </div>
          </div>

          <div class="px-4 py-4">
            <slot />
          </div>
        </main>

        <!-- Right rail (scroll zone #3). Visible on xl+. -->
        <aside
          ref="rightScrollerEl"
          class="no-scrollbar hidden xl:block shrink-0 w-80 h-full overflow-y-auto overscroll-y-none px-4 py-4"
        >
          <div class="space-y-4">
            <InputText class="w-full" placeholder="Search…" />

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
                  <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div class="rounded-lg border border-gray-200 p-3 dark:border-zinc-800">
                      Placeholder card (could be announcements, promos, ads, etc.)
                    </div>
                    <div class="rounded-lg border border-gray-200 p-3 dark:border-zinc-800">
                      Another placeholder card
                    </div>
                  </div>
                </template>
              </Card>

              <Card>
                <template #title>Suggestions</template>
                <template #content>
                  <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div class="flex items-center justify-between">
                      <div class="min-w-0">
                        <div class="font-medium">Men of Hunger</div>
                        <div class="text-gray-500 dark:text-gray-400">@menofhunger</div>
                      </div>
                      <Button label="Follow" severity="secondary" size="small" />
                    </div>
                  </div>
                </template>
              </Card>

              <Card>
                <template #title>Who to follow</template>
                <template #content>
                  <div class="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
                        <div class="min-w-0">
                          <div class="font-semibold truncate">Builder Weekly</div>
                          <div class="text-gray-500 dark:text-gray-400 truncate">@builderweekly</div>
                        </div>
                      </div>
                      <Button label="Follow" severity="secondary" size="small" />
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
                        <div class="min-w-0">
                          <div class="font-semibold truncate">Strength Log</div>
                          <div class="text-gray-500 dark:text-gray-400 truncate">@strengthlog</div>
                        </div>
                      </div>
                      <Button label="Follow" severity="secondary" size="small" />
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />
                        <div class="min-w-0">
                          <div class="font-semibold truncate">Men’s Groups</div>
                          <div class="text-gray-500 dark:text-gray-400 truncate">@mensgroups</div>
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
                  <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-semibold">Daily Discipline</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">14 members · 3 new posts</div>
                      </div>
                      <Tag value="New" severity="success" />
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-semibold">Business Builders</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">62 members · 1 new post</div>
                      </div>
                      <Tag value="Active" severity="info" />
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-semibold">Strength & Conditioning</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">28 members · 0 new posts</div>
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
                  <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div class="rounded-lg border border-gray-200 p-3 dark:border-zinc-800">
                      <div class="flex items-center justify-between">
                        <div class="font-semibold">Ad slot</div>
                        <Tag value="Ad" severity="secondary" />
                      </div>
                      <p class="mt-2 text-gray-600 dark:text-gray-300">
                        Placeholder for a promoted card. Could be a course, sponsor, or affiliate link.
                      </p>
                      <Button label="Learn more" class="mt-3 w-full rounded-full" severity="secondary" />
                    </div>
                  </div>
                </template>
              </Card>

              <div class="px-2 text-xs text-gray-500 dark:text-gray-400 space-x-2">
                <NuxtLink to="/about" class="hover:underline">About</NuxtLink>
                <span>·</span>
                <a href="#" class="hover:underline">Privacy</a>
                <span>·</span>
                <a href="#" class="hover:underline">Terms</a>
                <span>·</span>
                <span>&copy; {{ new Date().getFullYear() }} {{ siteConfig.name }}</span>
              </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import logoLightSmall from '~/assets/images/logo-white-bg-small.png'
import logoDarkSmall from '~/assets/images/logo-black-bg-small.png'

const route = useRoute()

const title = computed(() => {
  // Nuxt provides the current route's meta title via useRoute().meta in many cases.
  // Keep a simple fallback.
  return (route.meta?.title as string) || 'Home'
})

const navItems = [
  { label: 'Home', to: '/home', icon: 'pi-home' },
  { label: 'Explore', to: '/explore', icon: 'pi-compass' },
  { label: 'Notifications', to: '/notifications', icon: 'pi-bell' },
  { label: 'Messages', to: '/messages', icon: 'pi-envelope' },
  { label: 'Groups', to: '/groups', icon: 'pi-users' },
  { label: 'Profile', to: '/profile', icon: 'pi-user' },
  { label: 'About', to: '/about', icon: 'pi-info-circle' },
  { label: 'API Health', to: '/api-health', icon: 'pi-heart' },
  { label: 'Test', to: '/test', icon: 'pi-sliders-h' }
]

const middleScrollerEl = ref<HTMLElement | null>(null)
const rightScrollerEl = ref<HTMLElement | null>(null)

function normalizeWheelDeltaY(e: WheelEvent, container: HTMLElement) {
  // deltaMode: 0=pixel, 1=line, 2=page
  if (e.deltaMode === 1) return e.deltaY * 16
  if (e.deltaMode === 2) return e.deltaY * container.clientHeight
  return e.deltaY
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

// Shared "virtual" scroll position for columns 2 + 3.
// Each column renders this position clamped to its own scroll range.
const coupledScrollY = ref(0)

function onCoupledWheel(e: WheelEvent) {
  const middle = middleScrollerEl.value
  const right = rightScrollerEl.value
  if (!middle || !right) return

  // If the right rail is not visible (below xl), don't intercept scrolling.
  if (right.clientHeight === 0 || right.offsetParent === null) return

  const dy = normalizeWheelDeltaY(e, middle)
  if (dy === 0) return

  // We fully control the scroll so it behaves the same regardless of pointer zone.
  e.preventDefault()

  const maxMiddle = Math.max(0, middle.scrollHeight - middle.clientHeight)
  const maxRight = Math.max(0, right.scrollHeight - right.clientHeight)
  const maxCoupled = Math.max(maxMiddle, maxRight)

  // Advance shared position (this is the "underlying scroll position").
  coupledScrollY.value = clamp(coupledScrollY.value + dy, 0, maxCoupled)

  // Apply it to each column.
  middle.scrollTop = clamp(coupledScrollY.value, 0, maxMiddle)
  right.scrollTop = clamp(coupledScrollY.value, 0, maxRight)
}

let middleWheelHandler: ((e: WheelEvent) => void) | null = null
let rightWheelHandler: ((e: WheelEvent) => void) | null = null

onMounted(() => {
  if (!import.meta.client) return
  if (!middleScrollerEl.value) return

  // Initialize shared position from current scrollTop.
  coupledScrollY.value = middleScrollerEl.value.scrollTop

  middleWheelHandler = (e: WheelEvent) => onCoupledWheel(e)
  middleScrollerEl.value.addEventListener('wheel', middleWheelHandler, { passive: false })

  if (rightScrollerEl.value) {
    // Keep shared position aligned if the right rail is manually scrolled (e.g. touch).
    rightScrollerEl.value.addEventListener(
      'scroll',
      () => {
        if (!rightScrollerEl.value) return
        coupledScrollY.value = Math.max(coupledScrollY.value, rightScrollerEl.value.scrollTop)
      },
      { passive: true }
    )

    rightWheelHandler = (e: WheelEvent) => onCoupledWheel(e)
    rightScrollerEl.value.addEventListener('wheel', rightWheelHandler, { passive: false })
  }
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (middleScrollerEl.value && middleWheelHandler) {
    middleScrollerEl.value.removeEventListener('wheel', middleWheelHandler)
  }
  if (rightScrollerEl.value && rightWheelHandler) {
    rightScrollerEl.value.removeEventListener('wheel', rightWheelHandler)
  }
  middleWheelHandler = null
  rightWheelHandler = null
})
</script>

