<template>
  <section v-if="digest?.items.length" class="space-y-3 px-4">
    <h2 class="text-sm font-semibold moh-text">Today on X</h2>
    <p class="text-xs moh-text-muted">Selected stories · Updated {{ updated }}</p>
    <a
v-for="story in digest.items.slice(0, 5)" :key="story.id" :href="story.sourceUrl" target="_blank" rel="noopener noreferrer nofollow"
      class="block min-h-11 space-y-1 rounded-lg py-2 moh-focus">
      <p class="text-sm font-semibold moh-text">{{ story.title }}</p>
      <p v-if="story.summary" class="line-clamp-3 text-sm moh-text-muted">{{ story.summary }}</p>
      <p v-if="story.disclaimer" class="text-xs moh-text-muted">{{ story.disclaimer }}</p>
      <span class="text-xs text-[var(--moh-link)]">View on X ↗</span>
    </a>
  </section>
</template>

<script setup lang="ts">
import { formatLocaleTime } from '~/utils/time-format'
import type { XNewsDigestDto } from '~/types/api-contracts.gen'
const digest = ref<XNewsDigestDto | null>(null)
const { apiFetchData } = useApiClient()
const updated = computed(() => digest.value ? formatLocaleTime(new Date(digest.value.fetchedAt), { hour: 'numeric', minute: '2-digit' }) : '')
let expiry: ReturnType<typeof setTimeout> | undefined
let request: AbortController | undefined
async function load() {
  request?.abort(); clearTimeout(expiry)
  const current = new AbortController(); request = current
  try {
    const result = await apiFetchData<XNewsDigestDto | null>('/me/integrations/x/news', { signal: current.signal })
    if (current.signal.aborted) return
    digest.value = result && Date.parse(result.expiresAt) > Date.now() ? result : null
    if (digest.value) expiry = setTimeout(() => { digest.value = null }, Date.parse(digest.value.expiresAt) - Date.now())
  } catch { if (!current.signal.aborted) digest.value = null }
}
function activated() { if (document.visibilityState === 'visible') void load() }
onMounted(() => { void load(); document.addEventListener('visibilitychange', activated) })
onBeforeUnmount(() => { request?.abort(); clearTimeout(expiry); document.removeEventListener('visibilitychange', activated) })
</script>
