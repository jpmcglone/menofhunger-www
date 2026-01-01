<template>
  <!-- Single shared scroll container (like X): side rails are sticky INSIDE this scroller. -->
  <div class="h-dvh overflow-y-auto overscroll-y-none bg-white text-gray-900 dark:bg-black dark:text-gray-50">
    <div class="mx-auto flex w-full max-w-5xl px-2 sm:px-4 xl:max-w-6xl">
      <!-- Left Nav -->
      <aside class="sticky top-0 h-dvh shrink-0 border-r border-gray-200 dark:border-zinc-800">
        <div class="flex h-full w-14 flex-col overflow-hidden px-1 py-4 transition-[width,padding] duration-200 ease-out md:w-64 md:px-3">
          <div class="mb-3 flex items-center justify-center md:justify-start">
            <AppLogo :alt="siteConfig.name" :width="32" :height="32" imgClass="h-8 w-8 rounded" />
            <span
              class="ml-3 whitespace-nowrap overflow-hidden text-base font-semibold tracking-wide transition-[max-width,opacity] duration-200 ease-out max-w-0 opacity-0 md:max-w-[220px] md:opacity-100"
            >
              {{ siteConfig.name }}
            </span>
          </div>

          <nav class="flex-1 space-y-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              :class="[
                // Thin mode: fixed rounded-square hit area with centered icon (like X).
                // Wide mode (md+): pill-style row with icon + label.
                'group mx-auto flex h-12 w-12 items-center justify-center gap-0 rounded-xl text-gray-900 hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-zinc-900 md:mx-0 md:h-auto md:w-full md:justify-start md:gap-4 md:rounded-full md:px-4 md:py-3',
                route.path === item.to ? 'bg-gray-100 font-semibold dark:bg-zinc-900' : 'font-medium'
              ]"
            >
              <i class="pi text-2xl md:text-xl" :class="item.icon" aria-hidden="true" />
              <span
                class="whitespace-nowrap overflow-hidden text-xl md:text-base transition-[max-width,opacity] duration-200 ease-out max-w-0 opacity-0 md:max-w-[220px] md:opacity-100"
              >
                {{ item.label }}
              </span>
            </NuxtLink>

            <div class="pt-2">
              <!-- Ensure only ONE Post button ever renders (avoids CSS override issues). -->
              <Button
                v-if="!isMdUp"
                class="mx-auto h-12 w-12 rounded-xl !border-0 !p-0 !shadow-none !bg-black !text-white dark:!bg-white dark:!text-black"
                icon="pi pi-plus"
                aria-label="Post"
              />
              <Button
                v-else
                class="w-full rounded-full !border-0 !shadow-none !bg-black !text-white dark:!bg-white dark:!text-black"
                label="Post"
              />
            </div>
          </nav>

          <div class="mt-3 flex items-center justify-center md:justify-start md:px-2">
            <ClientOnly>
              <AppThemeModeMenu />
            </ClientOnly>
          </div>
        </div>
      </aside>

      <!-- Middle / Feed -->
      <main class="min-w-0 flex-1 border-r border-gray-200 dark:border-zinc-800">
        <div class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
          <div class="px-4 py-3">
            <h1 class="text-lg font-semibold">{{ title }}</h1>
          </div>
        </div>

        <div class="px-4 py-4">
          <slot />
        </div>
      </main>

      <!-- Right Sidebar -->
      <aside
        class="shrink-0 w-0 px-0 py-0 pointer-events-none overflow-hidden xl:sticky xl:top-0 xl:self-start xl:w-80 xl:px-4 xl:py-4 xl:pointer-events-auto xl:overflow-visible"
      >
        <!-- No independent scrolling: right rail rides the shared scroll container. -->
        <div class="space-y-4 opacity-0 translate-x-4 transition-[opacity,transform] duration-200 ease-out xl:opacity-100 xl:translate-x-0">
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
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'

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
  { label: 'Test', to: '/test', icon: 'pi-sliders-h' }
]

const isMdUp = ref(false)

onMounted(() => {
  const mq = window.matchMedia('(min-width: 768px)')
  const update = () => (isMdUp.value = mq.matches)
  update()
  mq.addEventListener?.('change', update)

  onBeforeUnmount(() => {
    mq.removeEventListener?.('change', update)
  })
})
</script>

