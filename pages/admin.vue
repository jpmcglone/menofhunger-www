<template>
  <AppPageContent class="h-full min-h-0" bottom="standard">
  <div class="h-full min-h-0">
    <div class="grid h-full min-h-0 grid-cols-1 md:grid-cols-[22rem_1fr]">
      <!-- Left: admin areas -->
      <aside class="hidden md:block h-full overflow-y-auto border-r moh-border">
        <div class="py-4">
          <div class="px-4 text-lg font-semibold">Admin</div>
          <div class="mt-4 divide-y divide-gray-200 dark:divide-zinc-800">
            <NuxtLink to="/admin/site-settings" :class="areaRowClass('site-settings')">
              <div class="flex items-center gap-3">
                <Icon name="tabler:settings" class="text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Site settings</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Configure post rate limits</div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/users" :class="areaRowClass('users')">
              <div class="flex items-center gap-3">
                <Icon name="tabler:users" class="text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Users</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Search and edit users</div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/verification" :class="areaRowClass('verification')">
              <div class="flex items-center gap-3">
                <Icon name="tabler:rosette-discount-check" class="text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Verification</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review pending verification requests</div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/media-review" :class="areaRowClass('media-review')">
              <div class="flex items-center gap-3">
                <Icon name="tabler:photo" class="text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Media review</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review and delete uploaded images and videos</div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/feedback" :class="areaRowClass('feedback')">
              <div class="flex items-center gap-3">
                <Icon name="tabler:inbox" class="text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Feedback</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Triaged feedback from users</div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/reports" :class="areaRowClass('reports')">
              <div class="flex items-center gap-3">
                <Icon name="tabler:flag" class="text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Reports</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review reported posts and users</div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/search" :class="areaRowClass('search')">
              <div class="flex items-center gap-3">
                <Icon name="tabler:search" class="text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Search</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Recent user searches</div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/jobs" :class="areaRowClass('jobs')">
              <div class="flex items-center gap-3">
                <Icon name="tabler:terminal-2" class="text-lg" aria-hidden="true" />
                <div class="min-w-0 flex-1">
                  <div class="font-semibold truncate">Jobs</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Run maintenance and backfill jobs</div>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </aside>

      <!-- Right: active admin route -->
      <main class="h-full overflow-y-auto">
        <!-- On desktop, the left pane is the "admin home"; keep the right pane empty on `/admin`. -->
        <!-- On mobile, the left pane is hidden, so `/admin` should still render its contents. -->
        <div :class="route.path === '/admin' ? 'md:hidden' : ''">
          <NuxtPage />
        </div>
      </main>
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: ['admin'],
})

const route = useRoute()

function isActiveArea(key: 'site-settings' | 'users' | 'verification' | 'media-review' | 'feedback' | 'reports' | 'search' | 'jobs') {
  const p = route.path
  if (key === 'site-settings') return p === '/admin/site-settings'
  if (key === 'users') return p === '/admin/users'
  if (key === 'verification') return p === '/admin/verification'
  if (key === 'media-review') return p === '/admin/media-review' || p.startsWith('/admin/media-review/')
  if (key === 'feedback') return p === '/admin/feedback'
  if (key === 'reports') return p === '/admin/reports'
  if (key === 'search') return p === '/admin/search'
  if (key === 'jobs') return p === '/admin/jobs'
  return false
}

function areaRowClass(key: 'site-settings' | 'users' | 'verification' | 'media-review' | 'feedback' | 'reports' | 'search' | 'jobs') {
  const active = isActiveArea(key)
  return [
    'block px-4 py-3 transition-colors',
    active
      ? 'moh-pane-row-active'
      : 'hover:bg-gray-50 dark:hover:bg-zinc-900',
  ]
}
</script>

