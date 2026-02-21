<template>
  <AppPageContent bottom="standard">
    <div class="px-4 py-4 space-y-6">
      <AppPageHeader title="Jobs" icon="tabler:terminal-2" description="Run maintenance, scoring, and backfill jobs.">
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

      <div class="grid gap-3">
        <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold moh-text">Daily content</div>
              <div class="text-xs moh-text-muted">
                Force refresh the Word of the Day + Daily quote (overwrites caches for today).
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                label="Refresh status"
                severity="secondary"
                :loading="dailyContentLoading"
                :disabled="dailyContentLoading"
                @click="refreshDailyContentStatus"
              />
              <Button
                label="Force refresh"
                :loading="runningKey === 'dailyContent'"
                :disabled="Boolean(runningKey)"
                @click="forceRefreshDailyContent"
              >
                <template #icon>
                  <Icon name="tabler:refresh" aria-hidden="true" />
                </template>
              </Button>
            </div>
          </div>

          <div v-if="dailyContent" class="grid grid-cols-2 gap-3 text-xs">
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Day key (ET)</div>
              <div class="mt-1 font-mono moh-text">{{ dailyContent.dayKey }}</div>
            </div>
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">WOTD</div>
              <div class="mt-1 font-semibold moh-text">{{ dailyContent.websters1828?.word || '—' }}</div>
              <div v-if="dailyContent.websters1828?.fetchedAt" class="mt-1 moh-text-muted">
                fetched {{ dailyContent.websters1828.fetchedAt }}
              </div>
            </div>
            <div class="rounded-lg border moh-border p-3 col-span-2">
              <div class="moh-text-muted">Daily quote</div>
              <div class="mt-1 moh-text">
                <span v-if="dailyContent.quote">“{{ dailyContent.quote.text }}”</span>
                <span v-else>—</span>
              </div>
              <div v-if="dailyContent.quote" class="mt-1 moh-text-muted">
                <span class="font-semibold">{{ dailyContent.quote.author }}</span>
                <span v-if="dailyContent.quote.reference"> · {{ dailyContent.quote.reference }}</span>
                <span v-if="dailyContent.quote.isParaphrase" class="ml-1">(paraphrase)</span>
              </div>
            </div>
          </div>

          <div v-else class="text-xs moh-text-muted">
            Status not loaded yet.
          </div>

          <p class="text-xs moh-text-muted">
            Tip: if prod looks stuck, force refresh here, then hard reload the web page to bypass any browser caching.
          </p>
        </div>

        <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold moh-text">Hashtags</div>
              <div class="text-xs moh-text-muted">
                Backfill hashtags from post bodies, clean up dead tags, and refresh trending.
              </div>
            </div>
            <div class="flex items-center gap-2">
              <AppFormField label="Batch size" class="min-w-[10rem]">
                <InputNumber v-model="hashtagBatchSize" :min="10" :max="5000" showButtons inputClass="w-full" />
              </AppFormField>
            </div>
          </div>

          <div v-if="hashtagBackfillStatus" class="grid grid-cols-2 gap-3 text-xs">
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Status</div>
              <div class="mt-1 font-semibold moh-text">{{ hashtagBackfillStatus.status }}</div>
            </div>
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Processed posts</div>
              <div class="mt-1 font-semibold moh-text">{{ hashtagBackfillStatus.processedPosts }}</div>
            </div>
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Updated posts</div>
              <div class="mt-1 font-semibold moh-text">{{ hashtagBackfillStatus.updatedPosts }}</div>
            </div>
            <div class="rounded-lg border moh-border p-3">
              <div class="moh-text-muted">Cursor</div>
              <div class="mt-1 font-mono moh-text truncate">{{ hashtagBackfillStatus.cursor || '—' }}</div>
            </div>
          </div>

          <div
            v-if="hashtagBackfillStatus?.lastError"
            class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
          >
            {{ hashtagBackfillStatus.lastError }}
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Button
              label="Refresh status"
              severity="secondary"
              :loading="hashtagBackfillLoading"
              :disabled="hashtagBackfillLoading"
              @click="refreshHashtagBackfillStatus"
            />
            <Button
              label="Start backfill (reset + rebuild)"
              :loading="hashtagBackfillRunning"
              :disabled="hashtagBackfillRunning"
              @click="startHashtagBackfill"
            >
              <template #icon>
                <Icon name="tabler:player-play" aria-hidden="true" />
              </template>
            </Button>
            <Button
              v-if="hashtagCanContinue"
              label="Continue"
              severity="secondary"
              :loading="hashtagBackfillRunning"
              :disabled="hashtagBackfillRunning"
              @click="continueHashtagBackfill"
            />
          </div>

          <p class="text-xs moh-text-muted">
            Note: “Start backfill” resets hashtag counts and rebuilds from posts. Prefer running this when load is low.
          </p>

          <div class="flex flex-wrap items-center gap-2">
            <Button
              label="Hashtags cleanup"
              severity="secondary"
              :loading="runningKey === 'hashtagsCleanup'"
              :disabled="Boolean(runningKey)"
              @click="runJob('hashtagsCleanup', 'Hashtags cleanup', '/admin/jobs/hashtags-cleanup')"
            />
            <Button
              label="Trending refresh"
              severity="secondary"
              :loading="runningKey === 'trending'"
              :disabled="Boolean(runningKey)"
              @click="runJob('trending', 'Hashtags trending refresh', '/admin/jobs/hashtags-trending-refresh')"
            />
          </div>
        </div>

        <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
          <div class="text-sm font-semibold moh-text">Maintenance</div>
          <div class="text-xs moh-text-muted">
            Safe, idempotent cleanup jobs (deletes expired/old data).
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              label="Auth cleanup"
              severity="secondary"
              :loading="runningKey === 'auth'"
              :disabled="Boolean(runningKey)"
              @click="runJob('auth', 'Auth cleanup', '/admin/jobs/auth-cleanup')"
            />
            <Button
              label="Search cleanup"
              severity="secondary"
              :loading="runningKey === 'search'"
              :disabled="Boolean(runningKey)"
              @click="runJob('search', 'Search cleanup', '/admin/jobs/search-cleanup')"
            />
            <Button
              label="Notifications cleanup"
              severity="secondary"
              :loading="runningKey === 'notifications'"
              :disabled="Boolean(runningKey)"
              @click="runJob('notifications', 'Notifications cleanup', '/admin/jobs/notifications-cleanup')"
            />
            <Button
              label="Notifications orphan cleanup"
              severity="secondary"
              :loading="runningKey === 'notificationsOrphans'"
              :disabled="Boolean(runningKey)"
              @click="runJob('notificationsOrphans', 'Notifications orphan cleanup', '/admin/jobs/notifications-orphan-cleanup')"
            />
          </div>
        </div>

        <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
          <div class="text-sm font-semibold moh-text">Backfills</div>
          <div class="text-xs moh-text-muted">
            Jobs that scan existing data and compute missing cached fields.
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              label="Posts topics backfill"
              severity="secondary"
              :loading="runningKey === 'topics'"
              :disabled="Boolean(runningKey)"
              @click="runJob('topics', 'Posts topics backfill', '/admin/jobs/posts-topics-backfill', { wipeExisting: topicsWipeExisting })"
            />
            <div class="flex items-center gap-2 pl-1">
              <Checkbox v-model="topicsWipeExisting" binary inputId="moh-topics-wipe" />
              <label for="moh-topics-wipe" class="text-xs moh-text-muted select-none">
                Wipe & rebuild
              </label>
            </div>
            <Button
              label="Normalize topic data (users + follows)"
              severity="secondary"
              :loading="runningKey === 'topicsNormalize'"
              :disabled="Boolean(runningKey)"
              @click="runJob('topicsNormalize', 'Normalize topic data', '/admin/jobs/topics-normalize')"
            />
            <Button
              label="Link metadata backfill"
              severity="secondary"
              :loading="runningKey === 'links'"
              :disabled="Boolean(runningKey)"
              @click="runJob('links', 'Link metadata backfill', '/admin/jobs/link-metadata-backfill')"
            />
          </div>
        </div>

        <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
          <div class="text-sm font-semibold moh-text">Scoring</div>
          <div class="text-xs moh-text-muted">
            Precompute scores/snapshots so hot paths are fast.
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              label="Posts popular refresh"
              severity="secondary"
              :loading="runningKey === 'popular'"
              :disabled="Boolean(runningKey)"
              @click="runJob('popular', 'Posts popular refresh', '/admin/jobs/posts-popular-refresh')"
            />
          </div>
        </div>

        <p class="text-xs moh-text-muted">
          Tip: scheduled jobs still run automatically on the server; these buttons just let you trigger a run immediately.
        </p>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { AdminHashtagBackfillStatus, DailyContentToday } from '~/types/api'

definePageMeta({
  layout: 'app',
  title: 'Jobs',
  middleware: 'admin',
})

usePageSeo({
  title: 'Admin Jobs',
  description: 'Run maintenance and backfill jobs.',
  canonicalPath: '/admin/jobs',
  noindex: true,
})

type JobKey =
  | 'auth'
  | 'search'
  | 'notifications'
  | 'notificationsOrphans'
  | 'hashtagsCleanup'
  | 'topics'
  | 'topicsNormalize'
  | 'links'
  | 'popular'
  | 'trending'
  | 'dailyContent'

const { apiFetch, apiFetchData } = useApiClient()
const toast = useAppToast()

const runningKey = ref<JobKey | null>(null)

const hashtagBatchSize = ref(500)
const hashtagBackfillStatus = ref<AdminHashtagBackfillStatus | null>(null)
const hashtagBackfillLoading = ref(false)
const hashtagBackfillRunning = ref(false)

const dailyContent = ref<DailyContentToday | null>(null)
const dailyContentLoading = ref(false)

async function refreshDailyContentStatus() {
  dailyContentLoading.value = true
  try {
    dailyContent.value = await apiFetchData<DailyContentToday>('/admin/daily-content/today', { method: 'GET' })
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to load daily content status.')
  } finally {
    dailyContentLoading.value = false
  }
}

async function forceRefreshDailyContent() {
  const ok = confirm('Force refresh Word of the Day + Daily quote for today? This overwrites caches.')
  if (!ok) return
  runningKey.value = 'dailyContent'
  try {
    dailyContent.value = await apiFetchData<DailyContentToday>('/admin/daily-content/refresh', { method: 'POST', body: { quote: true, websters1828: true } })
    toast.push({ title: 'Daily content refreshed', tone: 'success', durationMs: 1800 })
  } catch (e: unknown) {
    toast.pushError(e, 'Daily content refresh failed.')
  } finally {
    runningKey.value = null
  }
}

const hashtagCanContinue = computed(() => {
  if (!hashtagBackfillStatus.value) return false
  if (hashtagBackfillStatus.value.status !== 'running') return false
  return Boolean(hashtagBackfillStatus.value.cursor)
})

async function runJob(key: JobKey, label: string, path: string, body?: Record<string, any>) {
  runningKey.value = key
  try {
    await apiFetchData<{ ok: true }>(path, body ? { method: 'POST', body } : { method: 'POST' })
    toast.push({ title: label, tone: 'success', durationMs: 1600 })
  } catch (e: unknown) {
    toast.pushError(e, `${label} failed.`)
  } finally {
    runningKey.value = null
  }
}

const topicsWipeExisting = ref(false)

async function refreshHashtagBackfillStatus() {
  hashtagBackfillLoading.value = true
  try {
    const res = await apiFetch<AdminHashtagBackfillStatus | null>('/admin/jobs/hashtags/backfill', { method: 'GET' })
    hashtagBackfillStatus.value = res.data ?? null
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to load hashtag backfill status.')
  } finally {
    hashtagBackfillLoading.value = false
  }
}

async function startHashtagBackfill() {
  hashtagBackfillRunning.value = true
  try {
    await apiFetchData('/admin/jobs/hashtags/backfill', {
      method: 'POST',
      body: { batchSize: hashtagBatchSize.value, reset: true },
    })
    await refreshHashtagBackfillStatus()
    toast.push({ title: 'Hashtag backfill started', tone: 'success', durationMs: 1800 })
  } catch (e: unknown) {
    toast.pushError(e, 'Hashtag backfill failed.')
  } finally {
    hashtagBackfillRunning.value = false
  }
}

async function continueHashtagBackfill() {
  if (!hashtagBackfillStatus.value?.id) return
  const cursor = hashtagBackfillStatus.value.cursor
  if (!cursor) return
  hashtagBackfillRunning.value = true
  try {
    await apiFetchData('/admin/jobs/hashtags/backfill', {
      method: 'POST',
      body: { runId: hashtagBackfillStatus.value.id, cursor, batchSize: hashtagBatchSize.value },
    })
    await refreshHashtagBackfillStatus()
    toast.push({ title: 'Hashtag backfill continued', tone: 'success', durationMs: 1600 })
  } catch (e: unknown) {
    toast.pushError(e, 'Hashtag backfill failed.')
  } finally {
    hashtagBackfillRunning.value = false
  }
}

onMounted(() => {
  void refreshHashtagBackfillStatus()
  void refreshDailyContentStatus()
})
</script>

