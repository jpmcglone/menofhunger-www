<template>
  <AppPageContent class="h-full min-h-0" bottom="standard">
    <div class="h-full min-h-0">
      <template v-if="isFullWidthRoute">
        <main class="h-full overflow-y-auto">
          <NuxtPage />
        </main>
      </template>

      <div v-else class="grid h-full min-h-0 grid-cols-1 md:grid-cols-[22rem_1fr]">
        <!-- Desktop sidebar -->
        <aside class="hidden md:block h-full overflow-y-auto border-r moh-border">
          <div class="py-4">
            <div class="px-4 pb-3 text-lg font-semibold">Admin</div>
            <div class="space-y-1">
              <template v-for="section in adminSections" :key="section.title">
                <div class="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {{ section.title }}
                </div>
                <div class="moh-divide">
                  <NuxtLink
                    v-for="item in section.items"
                    :key="item.key"
                    :to="item.to"
                    :class="sidebarRowClass(item)"
                  >
                    <div class="flex items-center gap-3">
                      <Icon :name="item.icon" class="text-lg" aria-hidden="true" />
                      <div class="min-w-0 flex-1">
                        <div class="font-semibold truncate">{{ item.label }}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-300 truncate">{{ item.description }}</div>
                      </div>
                    </div>
                  </NuxtLink>
                </div>
              </template>
            </div>
          </div>
        </aside>

        <!-- Right pane: child route, or the mobile-only home list -->
        <main class="h-full overflow-y-auto">
          <template v-if="route.path === '/admin'">
            <!-- Desktop: right pane stays empty — sidebar is the nav -->
            <!-- Mobile: render the full nav list as the home screen -->
            <div class="md:hidden">
              <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Admin" description="Admin-only tools." />
              <div class="pb-4">
                <template v-for="section in adminSections" :key="section.title">
                  <div class="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {{ section.title }}
                  </div>
                  <div class="moh-divide">
                    <NuxtLink
                      v-for="item in section.items"
                      :key="item.key"
                      :to="item.to"
                      class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
                    >
                      <div class="flex items-center gap-3">
                        <Icon :name="item.icon" class="text-lg" aria-hidden="true" />
                        <div class="min-w-0 flex-1">
                          <div class="font-semibold truncate">{{ item.label }}</div>
                          <div class="text-sm text-gray-600 dark:text-gray-300 truncate">{{ item.description }}</div>
                        </div>
                        <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
                      </div>
                    </NuxtLink>
                  </div>
                </template>
              </div>
            </div>
          </template>
          <template v-else>
            <NuxtPage />
          </template>
        </main>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: ['admin'],
  ssr: false,
})

const route = useRoute()

interface AdminNavItem {
  key: string
  to: string
  icon: string
  label: string
  description: string
}

interface AdminSection {
  title: string
  items: AdminNavItem[]
}

const adminSections: AdminSection[] = [
  {
    title: 'Users',
    items: [
      { key: 'users', to: '/admin/users', icon: 'tabler:users', label: 'Users', description: 'Search and edit users' },
      { key: 'impersonate', to: '/admin/impersonate', icon: 'tabler:eye', label: 'Log in as user', description: 'See the app exactly as a member sees it' },
      { key: 'verification', to: '/admin/verification', icon: 'tabler:rosette-discount-check', label: 'Verification', description: 'Review pending verification requests' },
    ],
  },
  {
    title: 'Content',
    items: [
      { key: 'media-review', to: '/admin/media-review', icon: 'tabler:photo', label: 'Media review', description: 'Review and delete uploaded images and videos' },
      { key: 'reports', to: '/admin/reports', icon: 'tabler:flag', label: 'Reports', description: 'Review reported posts and users' },
      { key: 'feedback', to: '/admin/feedback', icon: 'tabler:inbox', label: 'Feedback', description: 'Triaged feedback from users' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { key: 'search', to: '/admin/search', icon: 'tabler:search', label: 'Search', description: 'Recent user searches' },
      { key: 'analytics', to: '/admin/analytics', icon: 'tabler:chart-bar', label: 'Analytics', description: 'KPIs, engagement trends, and monetization' },
      { key: 'push', to: '/admin/push', icon: 'tabler:bell-ringing', label: 'Push notifications', description: 'Send a test push on iOS or web' },
      { key: 'jobs', to: '/admin/jobs', icon: 'tabler:terminal-2', label: 'Jobs', description: 'Run maintenance and backfill jobs' },
      { key: 'site-settings', to: '/admin/site-settings', icon: 'tabler:settings', label: 'Site settings', description: 'Configure post rate limits' },
    ],
  },
  {
    title: 'AI & Monetization',
    items: [
      { key: 'marv', to: '/admin/marv', icon: 'tabler:robot', label: 'M.A.R.V.', description: 'AI helper config, usage, and cost' },
      { key: 'affiliates', to: '/admin/affiliates', icon: 'tabler:coins', label: 'Referral Pilot', description: 'Manage pilot members and settle payouts' },
    ],
  },
]

const isFullWidthRoute = computed(() => {
  const p = route.path
  return /^\/admin\/users\/[^/]+/.test(p) && p !== '/admin/users'
})

function isActiveArea(item: AdminNavItem): boolean {
  const p = route.path
  if (item.key === 'media-review') return p === item.to || p.startsWith('/admin/media-review/')
  if (item.key === 'users') return p === item.to || p.startsWith('/admin/users/')
  return p === item.to
}

function sidebarRowClass(item: AdminNavItem): string[] {
  return [
    'block px-4 py-3 transition-colors',
    isActiveArea(item) ? 'moh-pane-row-active' : 'hover:bg-gray-50 dark:hover:bg-zinc-900',
  ]
}
</script>
