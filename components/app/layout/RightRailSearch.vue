<template>
  <div
    v-if="!forcedHidden"
    aria-label="Right rail search"
    :class="[
      // Fixed overlay aligned with the same max-width container as the columns.
      // Match the right rail breakpoint (right rail is hidden below ~962px).
      'hidden min-[962px]:block fixed left-0 right-0 top-0 z-40 pointer-events-none',
      'transition-opacity duration-200 ease-out',
      hideSearch ? 'opacity-0 pointer-events-none' : 'opacity-100'
    ]"
  >
    <div class="mx-auto w-full max-w-6xl xl:max-w-7xl flex justify-end">
      <div
        :class="[
          'pointer-events-auto border-b moh-border moh-bg moh-texture',
          'transition-[width] duration-200 ease-out motion-reduce:transition-none',
          showRadioChat ? 'w-[var(--moh-right-rail-chat-w)]' : 'w-[var(--moh-right-rail-w)]',
        ]"
      >
        <div class="moh-gutter-x h-16 flex items-center">
          <AppSearchTypeahead
            ref="searchInputRef"
            v-model="rightRailSearchQuery"
            placeholder="Search…"
            :pill="true"
            @submit="goToExploreSearch"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Floating right-rail search (desktop only); collapses on Explore, which owns its own search field. */
defineProps<{ forcedHidden: boolean; hideSearch: boolean; showRadioChat: boolean }>()

const route = useRoute()
const searchInputRef = ref<{ focus: () => void } | null>(null)
const rightRailSearchQuery = ref('')

function goToExploreSearch(q?: string) {
  const query = (q ?? rightRailSearchQuery.value ?? '').trim()
  // Empty Enter still opens Explore — just without a prefilled query.
  if (!query) {
    void navigateTo({ path: '/explore' })
    return
  }
  void navigateTo({ path: '/explore', query: { q: query } })
}
watch(
  [() => route.path, () => route.query.q],
  () => {
    if (route.path === '/explore' && route.query.q != null) {
      rightRailSearchQuery.value = String(route.query.q).trim()
    }
  },
  { immediate: true },
)

defineExpose({ focus: () => searchInputRef.value?.focus() })
</script>
