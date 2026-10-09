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
/** Runs `fn` as the single in-flight job: `runningKey` marks it for the UI and the error toast uses `error`. */
const jobAction = useAsyncAction()
async function runKeyed<T>(key: JobKey, fn: () => Promise<T>, error: string, onSuccess?: (result: T) => void) {
  runningKey.value = key
  try {
    await jobAction.run(fn, { error, onSuccess })
  } finally {
    runningKey.value = null
  }
}

const hashtagBatchSize = ref(500)
const hashtagBackfillStatus = ref<AdminHashtagBackfillStatus | null>(null)
const { run: runBackfillStatus, pending: hashtagBackfillLoading } = useAsyncAction()
const { run: runBackfill, pending: hashtagBackfillRunning } = useAsyncAction()

const dailyContent = ref<DailyContentToday | null>(null)
const { run: runDailyContentStatus, pending: dailyContentLoading } = useAsyncAction()

const queues = ref<AdminQueuesHealth | null>(null)
const { run: runQueues, pending: queuesLoading } = useAsyncAction()

async function refreshQueues() {
  await runQueues(
    () => apiFetchData<AdminQueuesHealth>('/admin/jobs/queues', { method: 'GET' }),
    { error: 'Failed to load queue health.', onSuccess: (res) => { queues.value = res } },
  )
}

async function refreshDailyContentStatus() {
  await runDailyContentStatus(
    () => apiFetchData<DailyContentToday>('/admin/daily-content/today', { method: 'GET' }),
    { error: 'Failed to load daily content status.', onSuccess: (res) => { dailyContent.value = res } },
  )
}

async function forceRefreshDailyContent() {
  const ok = confirm('Force refresh Word of the Day + Daily quote for today? This overwrites caches.')
  if (!ok) return
  await runKeyed(
    'dailyContent',
    () => apiFetchData<DailyContentToday>('/admin/daily-content/refresh', { method: 'POST', body: { quote: true, websters1828: true } }),
    'Daily content refresh failed.',
    (res) => {
      dailyContent.value = res
      toast.push({ title: 'Daily content refreshed', tone: 'success', durationMs: 1800 })
    },
  )
}

const hashtagCanContinue = computed(() => {
  if (!hashtagBackfillStatus.value) return false
  if (hashtagBackfillStatus.value.status !== 'running') return false
  return Boolean(hashtagBackfillStatus.value.cursor)
})

async function runJob(key: JobKey, label: string, path: string, body?: Record<string, unknown>) {
  await runKeyed(
    key,
    () => apiFetchData<{ ok: true }>(path, body ? { method: 'POST', body } : { method: 'POST' }),
    `${label} failed.`,
    () => toast.push({ title: label, tone: 'success', durationMs: 1600 }),
  )
}

async function runDailyContentDedupe() {
  await runKeyed(
    'dailyContentDedupe',
    () => apiFetchData<{ ok: boolean; kept: number; deleted: number }>('/admin/jobs/notifications-dedupe-daily-content', { method: 'POST' }),
    'Daily content dedupe failed.',
    (result) => toast.push({ title: `Daily content deduped — ${result.deleted} deleted, ${result.kept} kept`, tone: 'success', durationMs: 3000 }),
  )
}

const topicsWipeExisting = ref(false)

async function refreshHashtagBackfillStatus() {
  await runBackfillStatus(
    () => apiFetch<AdminHashtagBackfillStatus | null>('/admin/jobs/hashtags/backfill', { method: 'GET' }),
    { error: 'Failed to load hashtag backfill status.', onSuccess: (res) => { hashtagBackfillStatus.value = res.data ?? null } },
  )
}

async function startHashtagBackfill() {
  await runBackfill(async () => {
    await apiFetchData('/admin/jobs/hashtags/backfill', {
      method: 'POST',
      body: { batchSize: hashtagBatchSize.value, reset: true },
    })
    await refreshHashtagBackfillStatus()
    toast.push({ title: 'Hashtag backfill started', tone: 'success', durationMs: 1800 })
  }, { error: 'Hashtag backfill failed.' })
}

async function continueHashtagBackfill() {
  if (!hashtagBackfillStatus.value?.id) return
  const cursor = hashtagBackfillStatus.value.cursor
  if (!cursor) return
  const runId = hashtagBackfillStatus.value.id
  await runBackfill(async () => {
    await apiFetchData('/admin/jobs/hashtags/backfill', {
      method: 'POST',
      body: { runId, cursor, batchSize: hashtagBatchSize.value },
    })
    await refreshHashtagBackfillStatus()
    toast.push({ title: 'Hashtag backfill continued', tone: 'success', durationMs: 1600 })
  }, { error: 'Hashtag backfill failed.' })
}

const entitlementsBackfillResult = ref<{ scanned: number; fixed: number } | null>(null)

async function runEntitlementsBackfill() {
  const ok = confirm('This will recompute entitlements for all users who have a stale premium flag (no active Stripe sub, no active grants). They will drop to verified. Continue?')
  if (!ok) return
  entitlementsBackfillResult.value = null
  await runKeyed(
    'entitlementsBackfill',
    () => apiFetchData<{ ok: boolean; scanned: number; fixed: number }>('/admin/jobs/entitlements-backfill', { method: 'POST' }),
    'Entitlements backfill failed.',
    (result) => {
      entitlementsBackfillResult.value = result
      toast.push({ title: `Fixed ${result.fixed} stale premium user(s)`, tone: 'success', durationMs: 3000 })
    },
  )
}

const streaksBackfillResult = ref<{ scanned: number; updated: number } | null>(null)
const coinsResetResult = ref<{ updated: number; newValue: number } | null>(null)

async function runStreaksBackfill() {
  const ok = confirm('Recompute streaks for all users from their post history? This may take a moment.')
  if (!ok) return
  streaksBackfillResult.value = null
  await runKeyed(
    'streaksBackfill',
    () => apiFetchData<{ ok: boolean; scanned: number; updated: number }>('/admin/jobs/streaks-backfill', { method: 'POST' }),
    'Streaks backfill failed.',
    (result) => {
      streaksBackfillResult.value = result
      toast.push({ title: `Streaks backfilled — ${result.updated} user(s) updated`, tone: 'success', durationMs: 3000 })
    },
  )
}

async function runCoinsReset() {
  const ok = confirm("Reset ALL users' coin balances to 1? This affects every account.")
  if (!ok) return
  coinsResetResult.value = null
  await runKeyed(
    'coinsReset',
    () => apiFetchData<{ ok: boolean; updated: number; newValue: number }>('/admin/jobs/coins-reset', { method: 'POST' }),
    'Coins reset failed.',
    (result) => {
      coinsResetResult.value = result
      toast.push({ title: `Coins reset for ${result.updated} user(s)`, tone: 'success', durationMs: 3000 })
    },
  )
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
