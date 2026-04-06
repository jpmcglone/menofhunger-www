<template>
  <AppPageContent bottom="standard">
    <div class="w-full">

      <!-- Loading -->
      <div v-if="loading" class="px-4 py-12 flex justify-center">
        <AppLogoLoader />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="px-4 py-6">
        <AppInlineAlert severity="danger">
          {{ error }}
        </AppInlineAlert>
      </div>

      <!-- No location params -->
      <div v-else-if="!route.query.state" class="px-4 py-6 text-sm moh-text-muted">
        No location specified.
      </div>

      <!-- Results -->
      <template v-else-if="data">
        <template v-for="section in visibleSections" :key="section.key">
          <div class="px-4 pt-6 pb-2">
            <h2 class="text-base font-bold tracking-tight moh-h2">
              {{ section.label }}
            </h2>
          </div>
          <div class="divide-y divide-gray-200 dark:divide-zinc-800">
            <div
              v-for="user in section.users"
              :key="user.id"
              class="px-4"
            >
              <AppWhoToFollowCompactRow :user="user" />
            </div>
          </div>
        </template>

        <div
          v-if="visibleSections.length === 0"
          class="px-4 py-8 text-center text-sm moh-text-muted"
        >
          No members found in this area yet.
        </div>
      </template>

    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { LocationBrowseResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  ssr: false,
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const { header } = useAppHeader()

// Build a human-readable title from query params.
const locationTitle = computed(() => {
  const city = typeof route.query.city === 'string' ? route.query.city.trim() : ''
  const state = typeof route.query.state === 'string' ? route.query.state.trim() : ''
  if (city && state) return `${city}, ${state}`
  if (state) return state
  return 'Location'
})

watchEffect(() => {
  header.value = { title: locationTitle.value, icon: 'tabler:map-pin' }
})

usePageSeo({ title: computed(() => locationTitle.value) })

const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<LocationBrowseResponse | null>(null)

const visibleSections = computed(() =>
  (data.value?.sections ?? []).filter((s) => s.users.length > 0),
)

async function fetchLocation() {
  const state = typeof route.query.state === 'string' ? route.query.state.trim() : ''
  if (!state) return

  loading.value = true
  error.value = null
  try {
    const query: Record<string, string | number> = { state, limit: 15 }
    if (typeof route.query.zip === 'string' && route.query.zip.trim()) query.zip = route.query.zip.trim()
    if (typeof route.query.city === 'string' && route.query.city.trim()) query.city = route.query.city.trim()
    if (typeof route.query.county === 'string' && route.query.county.trim()) query.county = route.query.county.trim()

    data.value = await apiFetchData<LocationBrowseResponse>('/users/by-location', {
      method: 'GET',
      query,
    })
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Failed to load members in this area.'
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchLocation()
})

// Re-fetch if query params change (e.g. navigating between locations).
watch(
  () => route.query,
  () => { void fetchLocation() },
  { deep: true },
)
</script>
