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
        Search is in progress. We don’t have a backend yet — results will appear here when it’s ready.
      </p>
    </div>

    <div v-else class="rounded-xl border moh-border px-4 py-6 text-center">
      <p class="text-sm moh-text-muted">
        Type something above and press Enter (or use the right column search and press Enter) to go to Explore with your query. Search results aren’t wired up yet.
      </p>
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
