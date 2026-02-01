<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <IconField iconPosition="left" class="w-full sm:max-w-md">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          class="w-full"
          placeholder="Search…"
          @keydown.enter="updateSearchUrl"
        />
      </IconField>
      <Button label="Search" icon="pi pi-search" severity="secondary" @click="updateSearchUrl" />
    </div>

    <div v-if="searchQueryTrimmed" class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-4">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Searching for: <span class="font-semibold">{{ searchQueryTrimmed }}</span>
      </p>
      <p class="mt-2 text-sm moh-text-muted">
        Search is in progress. We don't have a backend yet — results will appear here when it's ready.
      </p>
    </div>

    <div v-else class="space-y-6">
      <div class="rounded-xl border moh-border px-4 py-6 text-center">
        <p class="text-sm moh-text-muted">
          This page isn't working yet.
        </p>
        <p class="mt-3 text-sm moh-text-muted">
          You can see who's online now by
          <NuxtLink
            to="/online"
            class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-700 dark:hover:text-green-300 transition-colors"
          >
            <span class="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Online now
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Explore',
})

usePageSeo({
  title: 'Explore',
  description: 'Explore Men of Hunger — trending topics, discovery, and new groups worth joining.',
  canonicalPath: '/explore',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})

const route = useRoute()

const searchQuery = ref(String(route.query.q ?? '').trim())

const searchQueryTrimmed = computed(() => searchQuery.value.trim())

watch(
  () => route.query.q,
  (q) => {
    searchQuery.value = String(q ?? '').trim()
  },
  { immediate: true },
)

function updateSearchUrl() {
  const q = searchQuery.value.trim()
  void navigateTo({ path: '/explore', query: q ? { q } : {} })
}
</script>
