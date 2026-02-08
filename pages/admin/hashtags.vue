<template>
  <AppPageContent bottom="standard">
    <div class="py-4 space-y-4">
      <div class="px-4">
        <AppPageHeader title="Hashtags" icon="tabler:hash" description="Backfill and rebuild hashtag indexes.">
          <template #leading>
            <Button
              class="md:hidden"
              text
              severity="secondary"
              aria-label="Back"
              @click="navigateTo('/admin')"
            >
              <template #icon>
                <Icon name="tabler:chevron-left" aria-hidden="true" />
              </template>
            </Button>
          </template>
        </AppPageHeader>
      </div>

      <div v-if="error" class="px-4">
        <AppInlineAlert severity="danger">
          {{ error }}
        </AppInlineAlert>
      </div>

      <div class="px-4 space-y-3">
        <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold moh-text">Backfill run</div>
              <div class="text-xs moh-text-muted">
                Rebuilds `Post.hashtags` and hashtag counts from existing post bodies.
              </div>
            </div>
            <div class="flex items-center gap-2">
              <AppFormField label="Batch size" class="min-w-[10rem]">
                <InputNumber v-model="batchSize" :min="10" :max="5000" showButtons inputClass="w-full" />
              </AppFormField>
            </div>
          </div>

          <div v-if="status" class="grid grid-cols-2 gap-3 text-xs">
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Status</div>
              <div class="mt-1 font-semibold moh-text">{{ status.status }}</div>
            </div>
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Processed posts</div>
              <div class="mt-1 font-semibold moh-text">{{ status.processedPosts }}</div>
            </div>
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Updated posts</div>
              <div class="mt-1 font-semibold moh-text">{{ status.updatedPosts }}</div>
            </div>
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Cursor</div>
              <div class="mt-1 font-mono moh-text truncate">{{ status.cursor || '—' }}</div>
            </div>
          </div>

          <div v-if="status?.lastError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {{ status.lastError }}
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Button
              label="Refresh status"
              severity="secondary"
              :loading="loadingStatus"
              :disabled="loadingStatus"
              @click="refreshStatus"
            />
            <Button
              label="Start (reset + rebuild)"
              :loading="running"
              :disabled="running"
              @click="startRun"
            />
            <Button
              v-if="canContinue"
              label="Continue"
              severity="secondary"
              :loading="running"
              :disabled="running"
              @click="continueRun"
            />
          </div>

          <p class="text-xs moh-text-muted">
            Note: “Start” resets hashtag counts and rebuilds from posts. Don’t run this while you’re actively monitoring hashtag analytics.
          </p>
        </div>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Hashtags',
  middleware: 'admin',
})

usePageSeo({
  title: 'Hashtags',
  description: 'Admin hashtag tools.',
  canonicalPath: '/admin/hashtags',
  noindex: true,
})

type BackfillStatus = {
  id: string
  status: string
  cursor: string | null
  processedPosts: number
  updatedPosts: number
  resetDone: boolean
  startedAt: string
  finishedAt: string | null
  lastError: string | null
  updatedAt: string
}

const { apiFetch, apiFetchData } = useApiClient()

const batchSize = ref(500)
const error = ref<string | null>(null)
const status = ref<BackfillStatus | null>(null)
const loadingStatus = ref(false)
const running = ref(false)

const canContinue = computed(() => {
  if (!status.value) return false
  if (status.value.status !== 'running') return false
  return Boolean(status.value.cursor)
})

async function refreshStatus() {
  loadingStatus.value = true
  error.value = null
  try {
    const res = await apiFetch<{ id: string } | null>('/admin/hashtags/backfill', { method: 'GET' })
    status.value = (res.data ?? null) as any
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load status.'
  } finally {
    loadingStatus.value = false
  }
}

async function startRun() {
  running.value = true
  error.value = null
  try {
    await apiFetchData('/admin/hashtags/backfill', {
      method: 'POST',
      body: { batchSize: batchSize.value, reset: true },
    })
    await refreshStatus()
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Backfill failed.'
  } finally {
    running.value = false
  }
}

async function continueRun() {
  if (!status.value?.id) return
  running.value = true
  error.value = null
  try {
    await apiFetchData('/admin/hashtags/backfill', {
      method: 'POST',
      body: { runId: status.value.id, cursor: status.value.cursor, batchSize: batchSize.value },
    })
    await refreshStatus()
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Backfill failed.'
  } finally {
    running.value = false
  }
}

onMounted(() => {
  void refreshStatus()
})
</script>

