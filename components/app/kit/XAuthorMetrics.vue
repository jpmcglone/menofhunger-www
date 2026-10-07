<template>
  <section class="px-4 py-3">
    <button type="button" class="flex min-h-11 items-center gap-2 text-sm moh-text-muted" :aria-expanded="expanded" @click="toggle">
      <Icon name="tabler:chart-bar" aria-hidden="true" /> X results
    </button>
    <div v-if="expanded" class="space-y-3 pt-2">
      <p v-if="loading" role="status" class="text-sm moh-text-muted">Loading metrics…</p>
      <template v-else-if="metrics">
        <dl class="flex flex-wrap gap-5">
          <div v-for="item in values" :key="item.label">
            <dt class="text-xs moh-text-muted">{{ item.label }}</dt>
            <dd class="text-lg font-semibold moh-text">{{ item.value.toLocaleString() }}</dd>
          </div>
        </dl>
        <p class="text-xs moh-text-muted">Updated {{ new Date(metrics.fetchedAt).toLocaleString() }}</p>
        <a :href="metrics.externalUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center text-sm text-[var(--moh-link)]">View on X</a>
      </template>
      <p v-else class="text-sm moh-text-muted">Metrics aren't available right now.</p>
    </div>
  </section>
</template>
<script setup lang="ts">
import type { XAuthorMetricsDto } from '~/types/api-contracts.gen'
const props = defineProps<{ postId: string }>()
const { apiFetchData } = useApiClient()
const expanded = ref(false)
const loading = ref(false)
const metrics = ref<XAuthorMetricsDto | null>(null)
const values = computed(() => ([['likes', 'Likes'], ['replies', 'Replies'], ['reposts', 'Reposts'], ['quotes', 'Quotes'], ['impressions', 'Impressions']] as const)
  .flatMap(([key, label]) => typeof metrics.value?.[key] === 'number' ? [{ label, value: metrics.value[key]! }] : []))
let request: AbortController | undefined
let revision = 0
async function toggle() {
  const token = ++revision
  expanded.value = !expanded.value
  if (!expanded.value) { request?.abort(); return }
  loading.value = true
  request = new AbortController()
  try {
    const result = await apiFetchData<XAuthorMetricsDto | null>(`/me/integrations/x/metrics/${encodeURIComponent(props.postId)}`, { signal: request.signal })
    if (token === revision) metrics.value = result
  } catch { if (token === revision) metrics.value = null }
  finally { if (token === revision) loading.value = false }
}
onBeforeUnmount(() => request?.abort())
</script>
