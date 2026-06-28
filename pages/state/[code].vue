<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="sticky top-0 z-20 border-b moh-border moh-frosted moh-texture overflow-hidden">
        <div class="relative z-10 flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div class="min-w-0 flex-1">
            <div class="text-base sm:text-lg font-semibold">{{ stateLabel }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Posts from members in {{ stateLabel }}</div>
          </div>
        </div>
      </div>

      <AppInlineAlert v-if="error" class="mx-3 mt-3 sm:mx-4 sm:mt-4" severity="danger">
        {{ error }}
      </AppInlineAlert>

      <AppSubtleSectionLoader :loading="showInitialLoader" min-height-class="min-h-[240px]">
        <div
          v-if="initialLoadResolved && !displayPosts.length && !nextCursor && !loading"
          class="px-3 py-6 sm:px-4 sm:py-8 text-center text-[13px] sm:text-sm text-gray-500 dark:text-gray-400"
        >
          No posts from {{ stateLabel }} yet.
        </div>

        <div v-else class="relative mt-3">
          <template v-for="post in displayPosts" :key="post._localId ?? post.id">
            <AppFeedPostRow
              :post="post"
              :replies-sort="'new'"
            />
          </template>
        </div>

        <div v-if="nextCursor && !loading" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
          <Button
            label="Load more"
            text
            severity="secondary"
            :loading="loadingMore"
            @click="loadMore"
          />
        </div>
        <div v-else-if="loadingMore" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
          <div class="inline-flex transition-opacity duration-150">
            <AppLogoLoader compact />
          </div>
        </div>
      </AppSubtleSectionLoader>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  hideTopBar: true,
  ssr: false,
})

const route = useRoute()
const stateCode = computed(() => String(route.params.code ?? '').toUpperCase())

// Human-readable label map for common US states. Fallback to the code itself.
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington D.C.',
}

const stateLabel = computed(() => STATE_NAMES[stateCode.value] ?? stateCode.value)

usePageSeo({
  title: computed(() => `Posts from ${stateLabel.value}`),
  description: computed(() => `A feed of posts from Men of Hunger members in ${stateLabel.value}.`),
  canonicalPath: computed(() => `/state/${stateCode.value.toLowerCase()}`),
  noindex: true,
})

const {
  displayPosts,
  nextCursor,
  loading,
  loadingMore,
  error,
  refresh,
  loadMore,
} = usePostsFeed({
  authorLocationState: stateCode,
})

const initialLoadResolved = ref(false)
const showInitialLoader = computed(
  () => !initialLoadResolved.value || (loading.value && displayPosts.value.length === 0),
)

onMounted(async () => {
  try {
    await refresh()
  } finally {
    initialLoadResolved.value = true
  }
})

onActivated(async () => {
  await refresh()
})
</script>
