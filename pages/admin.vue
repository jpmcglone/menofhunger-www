<template>
  <div class="h-[calc(100dvh-9rem)] sm:h-[calc(100dvh-6.5rem)]">
    <div class="grid h-full grid-cols-1 md:grid-cols-[18rem_1fr]">
      <!-- Left: admin areas -->
      <aside class="hidden md:block h-full overflow-y-auto border-r moh-border pr-4">
        <div class="px-4 py-4">
          <div class="text-lg font-semibold">Admin</div>
          <div class="mt-4 space-y-2">
            <NuxtLink to="/admin/site-settings" class="block">
              <div :class="areaCardClass('site-settings')">
                <div class="flex items-center gap-3">
                  <i class="pi pi-cog text-lg" aria-hidden="true" />
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold truncate">Site settings</div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Configure post rate limits</div>
                  </div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/users" class="block">
              <div :class="areaCardClass('users')">
                <div class="flex items-center gap-3">
                  <i class="pi pi-users text-lg" aria-hidden="true" />
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold truncate">Users</div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Search and edit users</div>
                  </div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/media-review" class="block">
              <div :class="areaCardClass('media-review')">
                <div class="flex items-center gap-3">
                  <i class="pi pi-images text-lg" aria-hidden="true" />
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold truncate">Media review</div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review and delete uploaded images and videos</div>
                  </div>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/admin/search" class="block">
              <div :class="areaCardClass('search')">
                <div class="flex items-center gap-3">
                  <i class="pi pi-search text-lg" aria-hidden="true" />
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold truncate">Search</div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Recent user searches</div>
                  </div>
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
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: ['admin'],
})

const route = useRoute()

function isActiveArea(key: 'site-settings' | 'users' | 'media-review' | 'search') {
  const p = route.path
  if (key === 'site-settings') return p === '/admin/site-settings'
  if (key === 'users') return p === '/admin/users'
  if (key === 'media-review') return p === '/admin/media-review' || p.startsWith('/admin/media-review/')
  if (key === 'search') return p === '/admin/search'
  return false
}

function areaCardClass(key: 'site-settings' | 'users' | 'media-review' | 'search') {
  const active = isActiveArea(key)
  return [
    'w-full rounded-xl border p-3 transition-colors',
    active
      ? 'border-gray-300 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'
      : 'border-gray-200 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900',
  ]
}
</script>

