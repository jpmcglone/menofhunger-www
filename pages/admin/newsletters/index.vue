<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Newsletter" description="Draft, schedule, and send the lodge letter.">
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
      <template #trailing>
        <Button size="small" label="New" :loading="creating" @click="createNew" />
      </template>
    </AppPageHeader>

    <div v-if="error" class="px-4 py-4">
      <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
    </div>

    <div v-else-if="!loading && items.length === 0" class="px-4 py-8 text-sm moh-text-muted">
      No newsletters yet.
    </div>

    <div v-else class="moh-divide">
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="`/admin/newsletters/${item.id}`"
        class="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <div class="font-semibold truncate">{{ item.subject || 'Untitled' }}</div>
              <span class="moh-meta">{{ statusLabel(item) }}</span>
            </div>
            <div class="moh-meta">
              <template v-if="item.status === 'sent'">
                Sent to {{ item.sentCount }} of {{ item.eligibleCount }}
                <template v-if="item.failedCount"> · {{ item.failedCount }} failed</template>
              </template>
              <template v-else-if="item.status === 'sending'">
                Sending · {{ item.sentCount }} of {{ item.eligibleCount }}
              </template>
              <template v-else>
                {{ item.eligibleCount }}
                {{ summarizeAudienceFilters(item.audienceFilters) }}
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
import type { NewsletterAdmin } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { summarizeAudienceFilters } from '~/utils/newsletter-audience'

definePageMeta({
  layout: 'app',
  middleware: 'admin',
  ssr: false,
})

usePageSeo({
  title: 'Admin Newsletter',
  description: 'Write and send the lodge letter.',
  canonicalPath: '/admin/newsletters',
  noindex: true,
})

const { apiFetchData } = useApiClient()
const items = ref<NewsletterAdmin[]>([])
const loading = ref(true)
const creating = ref(false)
const error = ref('')

function formatWhen(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric' })
}

function statusLabel(item: NewsletterAdmin) {
  if (item.status === 'draft') return 'Draft'
  if (item.status === 'sending') return 'Sending'
  if (item.status === 'scheduled') return `Scheduled · ${formatWhen(item.scheduledAt)}`
  return `Sent · ${formatWhen(item.sentAt)}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await apiFetchData<NewsletterAdmin[]>('/admin/newsletters')
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to load newsletters.')
  } finally {
    loading.value = false
  }
}

async function createNew() {
  creating.value = true
  error.value = ''
  try {
    const created = await apiFetchData<NewsletterAdmin>('/admin/newsletters', { method: 'POST' })
    await navigateTo(`/admin/newsletters/${created.id}`)
  } catch (e) {
    error.value = getSafeUserErrorMessage(e, 'Failed to create newsletter.')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
