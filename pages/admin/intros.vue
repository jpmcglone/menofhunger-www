<template>
  <AppPageContent bottom="standard">
    <AppPageHeader
      sticky
      class="px-4 pt-4 pb-3"
      title="Intros"
      description="Weekly pairs who post about the same things and don’t follow each other. You make the intro."
    >
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon>
              <Icon name="tabler:chevron-left" />
            </template>
          </Button>
        </div>
      </template>
      <template #trailing>
        <Button
          label="Write this week"
          severity="secondary"
          rounded
          :loading="generating"
          :disabled="generating"
          @click="generate"
        />
      </template>
    </AppPageHeader>

    <div class="px-4 py-4 space-y-6">
      <AppInlineAlert v-if="error" severity="danger">
        {{ error }}
      </AppInlineAlert>

      <p v-if="generating" class="text-sm moh-text-muted" aria-live="polite">
        Writing this week — Astra takes a minute.
      </p>

      <div v-else-if="loading && !brief" class="space-y-2" aria-live="polite">
        <div class="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
        <div class="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
      </div>

      <p v-else-if="!brief" class="text-sm moh-text-muted">
        No briefing yet. Write this week after public posts have topics.
      </p>

      <template v-else>
        <div class="space-y-1">
          <div class="text-xs font-medium uppercase tracking-wide moh-text-muted">
            {{ brief.weekKey }} · {{ brief.modelUsed === 'none' ? 'no model' : brief.modelUsed }}
          </div>
          <p class="text-sm moh-text whitespace-pre-wrap">{{ brief.brief }}</p>
        </div>

        <div v-if="brief.pairs.length === 0" class="text-sm moh-text-muted">
          No pairs this week.
        </div>

        <div v-else class="moh-divide rounded-xl border moh-border">
          <div
            v-for="(pair, index) in brief.pairs"
            :key="`${pair.left.id}-${pair.right.id}-${index}`"
            class="px-4 py-3 space-y-2"
          >
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold">
              <NuxtLink :to="`/u/${pair.left.username}`" class="hover:underline">
                {{ pair.left.name || pair.left.username }}
              </NuxtLink>
              <span class="moh-text-muted font-normal">and</span>
              <NuxtLink :to="`/u/${pair.right.username}`" class="hover:underline">
                {{ pair.right.name || pair.right.username }}
              </NuxtLink>
            </div>
            <div v-if="pair.topics.length || (pair.groups ?? []).length" class="text-xs moh-text-muted">
              {{
                [
                  ...pair.topics.map(topicLabel),
                  ...(pair.groups ?? []),
                ].join(' · ')
              }}
            </div>
            <p class="text-sm moh-text">{{ pair.reason }}</p>
          </div>
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { AdminIntroBrief, AdminIntroBriefQueued } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'

const POLL_MS = 2_000
const POLL_DEADLINE_MS = 120_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

definePageMeta({
  layout: 'app',
  title: 'Intros (admin)',
  middleware: 'admin',
  ssr: false,
})

usePageSeo({
  title: 'Intros (admin)',
  description: 'Weekly intro briefing.',
  canonicalPath: '/admin/intros',
  noindex: true,
})

const { apiFetchData } = useApiClient()

const brief = ref<AdminIntroBrief | null>(null)
const loading = ref(false)
const generating = ref(false)
const error = ref<string | null>(null)

function topicLabel(value: string) {
  return value.replace(/_/g, ' ')
}

async function load() {
  loading.value = true
  error.value = null
  try {
    brief.value = await apiFetchData<AdminIntroBrief | null>('/admin/intros/brief', { method: 'GET' })
  } catch (e: unknown) {
    error.value = getSafeUserErrorMessage(e, 'Failed to load intros.')
  } finally {
    loading.value = false
  }
}

async function generate() {
  generating.value = true
  error.value = null
  const startedAt = Date.now()
  try {
    const queued = await apiFetchData<AdminIntroBriefQueued>('/admin/intros/brief', { method: 'POST' })
    const deadline = Date.now() + POLL_DEADLINE_MS
    while (Date.now() < deadline) {
      await sleep(POLL_MS)
      const next = await apiFetchData<AdminIntroBrief | null>('/admin/intros/brief', { method: 'GET' })
      const writtenAt = next ? new Date(next.createdAt).getTime() : 0
      if (next && next.weekKey === queued.weekKey && writtenAt >= startedAt - 5_000) {
        brief.value = next
        return
      }
    }
    error.value = 'Still writing. Refresh in a minute.'
    await load()
  } catch (e: unknown) {
    error.value = getSafeUserErrorMessage(e, 'Could not write this week’s intros.')
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
