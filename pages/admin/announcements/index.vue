<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Announcements" description="Each lodge notice once a day. Each ad every 12 hours. One per open.">
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
      <template #trailing>
        <Button as="NuxtLink" to="/admin/announcements/new" label="New" size="small" />
      </template>
    </AppPageHeader>

    <div v-if="error" class="px-4 py-4">
      <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
    </div>

    <div v-else-if="!loading && items.length === 0" class="px-4 py-8 text-sm moh-text-muted">
      No announcements yet.
    </div>

    <div v-else class="moh-divide">
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="`/admin/announcements/${item.id}`"
        class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <div class="font-semibold truncate">{{ item.title }}</div>
              <span class="moh-meta">{{ statusLabel(item.status) }}</span>
              <span v-if="item.isAd" class="moh-meta">Ad</span>
            </div>
            <div class="text-sm moh-text-muted line-clamp-1">
              {{ item.body || 'No body' }}
            </div>
            <div class="moh-meta">
              {{ item.stats.uniquePeople }} unique
              · {{ item.stats.totalViews }} views
              · {{ item.stats.clicks }} clicks
              <template v-if="item.stats.totalViews > 0">
                · {{ formatCtr(item.stats.ctr) }} CTR
              </template>
            </div>
          </div>
          <Icon name="tabler:chevron-right" class="text-gray-400 mt-1" aria-hidden="true" />
        </div>
      </NuxtLink>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { AnnouncementAdmin, AnnouncementStatus } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  middleware: 'admin',
  ssr: false,
})

usePageSeo({
  title: 'Admin Announcements',
  description: 'Create and publish lodge announcements.',
  canonicalPath: '/admin/announcements',
  noindex: true,
})

const { apiFetchData } = useApiClient()
const items = ref<AnnouncementAdmin[]>([])
const loading = ref(true)
const error = ref('')

function statusLabel(status: AnnouncementStatus) {
  if (status === 'published') return 'Live'
  if (status === 'archived') return 'Archived'
  return 'Draft'
}

function formatCtr(ctr: number) {
  return `${Math.round(ctr * 100)}%`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await apiFetchData<AnnouncementAdmin[]>('/admin/announcements')
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to load announcements.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
