import type { AdminHashtagBackfillStatus, AdminQueuesHealth, DailyContentToday } from '~/types/api'

export function useAdminJobsPage() {
type JobKey =
  | 'auth'
  | 'search'
  | 'notifications'
  | 'notificationsOrphans'
  | 'dailyContentDedupe'
  | 'hashtagsCleanup'
  | 'topics'
  | 'topicsAi'
  | 'topicsNormalize'
  | 'links'
  | 'popular'
  | 'trending'
  | 'dailyContent'
  | 'entitlementsBackfill'
  | 'streaksBackfill'
  | 'coinsReset'

const { apiFetch, apiFetchData } = useApiClient()
const toast = useAppToast()

const runningKey = ref<JobKey | null>(null)

const hashtagBatchSize = ref(500)
const hashtagBackfillStatus = ref<AdminHashtagBackfillStatus | null>(null)
const hashtagBackfillLoading = ref(false)
const hashtagBackfillRunning = ref(false)

const dailyContent = ref<DailyContentToday | null>(null)
const dailyContentLoading = ref(false)

const queues = ref<AdminQueuesHealth | null>(null)
const queuesLoading = ref(false)

async function refreshQueues() {
  queuesLoading.value = true
  try {
    queues.value = await apiFetchData<AdminQueuesHealth>('/admin/jobs/queues', { method: 'GET' })
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to load queue health.')
  } finally {
    queuesLoading.value = false
  }
}

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

async function runDailyContentDedupe() {
  runningKey.value = 'dailyContentDedupe'
  try {
    const result = await apiFetchData<{ ok: boolean; kept: number; deleted: number }>(
      '/admin/jobs/notifications-dedupe-daily-content',
      { method: 'POST' },
    )
    toast.push({ title: `Daily content deduped — ${result.deleted} deleted, ${result.kept} kept`, tone: 'success', durationMs: 3000 })
  } catch (e: unknown) {
    toast.pushError(e, 'Daily content dedupe failed.')
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

const entitlementsBackfillResult = ref<{ scanned: number; fixed: number } | null>(null)

async function runEntitlementsBackfill() {
  const ok = confirm('This will recompute entitlements for all users who have a stale premium flag (no active Stripe sub, no active grants). They will drop to verified. Continue?')
  if (!ok) return
  runningKey.value = 'entitlementsBackfill'
  entitlementsBackfillResult.value = null
  try {
    const result = await apiFetchData<{ ok: boolean; scanned: number; fixed: number }>('/admin/jobs/entitlements-backfill', { method: 'POST' })
    entitlementsBackfillResult.value = result
    toast.push({ title: `Fixed ${result.fixed} stale premium user(s)`, tone: 'success', durationMs: 3000 })
  } catch (e: unknown) {
    toast.pushError(e, 'Entitlements backfill failed.')
  } finally {
    runningKey.value = null
  }
}

const streaksBackfillResult = ref<{ scanned: number; updated: number } | null>(null)
const coinsResetResult = ref<{ updated: number; newValue: number } | null>(null)

async function runStreaksBackfill() {
  const ok = confirm('Recompute streaks for all users from their post history? This may take a moment.')
  if (!ok) return
  runningKey.value = 'streaksBackfill'
  streaksBackfillResult.value = null
  try {
    const result = await apiFetchData<{ ok: boolean; scanned: number; updated: number }>('/admin/jobs/streaks-backfill', { method: 'POST' })
    streaksBackfillResult.value = result
    toast.push({ title: `Streaks backfilled — ${result.updated} user(s) updated`, tone: 'success', durationMs: 3000 })
  } catch (e: unknown) {
    toast.pushError(e, 'Streaks backfill failed.')
  } finally {
    runningKey.value = null
  }
}

async function runCoinsReset() {
  const ok = confirm("Reset ALL users' coin balances to 1? This affects every account.")
  if (!ok) return
  runningKey.value = 'coinsReset'
  coinsResetResult.value = null
  try {
    const result = await apiFetchData<{ ok: boolean; updated: number; newValue: number }>('/admin/jobs/coins-reset', { method: 'POST' })
    coinsResetResult.value = result
    toast.push({ title: `Coins reset for ${result.updated} user(s)`, tone: 'success', durationMs: 3000 })
  } catch (e: unknown) {
    toast.pushError(e, 'Coins reset failed.')
  } finally {
    runningKey.value = null
  }
}

onMounted(() => {
  void refreshQueues()
  void refreshHashtagBackfillStatus()
  void refreshDailyContentStatus()
})
  return {
    refreshQueues,
    refreshDailyContentStatus,
    forceRefreshDailyContent,
    runJob,
    runDailyContentDedupe,
    refreshHashtagBackfillStatus,
    startHashtagBackfill,
    continueHashtagBackfill,
    runEntitlementsBackfill,
    runStreaksBackfill,
    runCoinsReset,
    toast,
    runningKey,
    hashtagBatchSize,
    hashtagBackfillStatus,
    hashtagBackfillLoading,
    hashtagBackfillRunning,
    dailyContent,
    dailyContentLoading,
    queues,
    queuesLoading,
    hashtagCanContinue,
    topicsWipeExisting,
    entitlementsBackfillResult,
    streaksBackfillResult,
    coinsResetResult,
    apiFetch,
    apiFetchData,
  }
}
