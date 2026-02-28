<template>
  <AppPageContent bottom="standard">
  <div class="space-y-6">
    <div class="px-4 pt-4">
      <AppPageHeader title="Admin" icon="tabler:shield" description="Admin-only tools." />
    </div>

    <div class="divide-y divide-gray-200 dark:divide-zinc-800 pb-4">
      <NuxtLink to="/admin/site-settings" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:settings" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Site settings</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Configure post rate limits</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/users" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:users" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Users</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Search and edit users</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/verification" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:rosette-discount-check" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Verification</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review pending verification requests</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/media-review" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:photo" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Media review</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review and delete uploaded images and videos</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/feedback" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:inbox" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Feedback</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Triaged feedback from users</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/reports" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:flag" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Reports</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review reported posts and users</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/search" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:search" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Search</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Recent user searches</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/jobs" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:terminal-2" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Jobs</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Run maintenance and backfill jobs</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/analytics" class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900">
        <div class="flex items-center gap-3">
          <Icon name="tabler:chart-bar" class="text-lg" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">Analytics</div>
            <div class="text-sm text-gray-600 dark:text-gray-300 truncate">KPIs, engagement trends, and monetization</div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
        </div>
      </NuxtLink>

    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">

definePageMeta({
  layout: 'app',
  title: 'Admin',
  middleware: 'admin',
})

usePageSeo({
  title: 'Admin',
  description: 'Admin tools for Men of Hunger.',
  canonicalPath: '/admin',
  noindex: true,
})
</script>

