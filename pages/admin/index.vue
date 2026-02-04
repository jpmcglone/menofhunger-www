<template>
  <div class="px-4 py-4 space-y-6">
    <AppPageHeader title="Admin" icon="pi-shield" description="Admin-only tools." />

    <div class="space-y-2">
      <NuxtLink to="/admin/site-settings" class="block">
        <div class="w-full rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <div class="flex items-center gap-3">
            <i class="pi pi-cog text-lg" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">Site settings</div>
              <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Configure post rate limits</div>
            </div>
            <i class="pi pi-angle-right text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/users" class="block">
        <div class="w-full rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <div class="flex items-center gap-3">
            <i class="pi pi-users text-lg" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">Users</div>
              <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Search and edit users</div>
            </div>
            <i class="pi pi-angle-right text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/media-review" class="block">
        <div class="w-full rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <div class="flex items-center gap-3">
            <i class="pi pi-images text-lg" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">Media review</div>
              <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Review and delete uploaded images and videos</div>
            </div>
            <i class="pi pi-angle-right text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/feedback" class="block">
        <div class="w-full rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <div class="flex items-center gap-3">
            <i class="pi pi-inbox text-lg" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">Feedback</div>
              <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Triaged feedback from users</div>
            </div>
            <i class="pi pi-angle-right text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/search" class="block">
        <div class="w-full rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
          <div class="flex items-center gap-3">
            <i class="pi pi-search text-lg" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">Search</div>
              <div class="text-sm text-gray-600 dark:text-gray-300 truncate">Recent user searches</div>
            </div>
            <i class="pi pi-angle-right text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Admin',
})

usePageSeo({
  title: 'Admin',
  description: 'Admin tools for Men of Hunger.',
  canonicalPath: '/admin',
  noindex: true,
})
</script>

