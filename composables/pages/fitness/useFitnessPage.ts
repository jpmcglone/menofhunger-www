import type { FitnessPage, FitnessSharePreview, PostVisibility } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { useFitnessPageCharts } from './useFitnessPageCharts'
import { useFitnessPageWeek } from './useFitnessPageWeek'
import type { InjectionKey } from 'vue'

/**
 * Script state for `/fitness`, shared with the fitness sections through
 * `useFitnessPageContext()`.
 */
export function useFitnessPage() {
  const state = useFitnessPageState()
  const charts = useFitnessPageCharts(state)
  const week = useFitnessPageWeek({ ...state, ...charts })
  const ctx = { ...state, ...charts, ...week }
  provide(FITNESS_PAGE_CONTEXT, ctx)
  return ctx
}

// Share dialog
export type ShareDialogState = { type: 'activity' | 'weight' | 'progress' | 'vo2max'; refId: string; preview: FitnessSharePreview }

/**
 * Page data, recent activity rows, form and share dialog state, accent colors,
 * Strava sync, and the page load.
 */
export function useFitnessPageState() {
  usePageSeo({
    title: 'Fitness',
    description: 'Your activity and progress.',
    canonicalPath: '/fitness',
    noindex: true,
  })

  const { apiFetchData } = useApiClient()
  const toast = useAppToast()

  const fitnessPage = ref<FitnessPage | null>(null)
  const loading = ref(true)
  const loadError = ref<string | null>(null)

  const ACTIVITY_PREVIEW_COUNT = 5
  const showAllActivities = ref(false)
  const displayedActivities = computed(() =>
    showAllActivities.value
      ? (fitnessPage.value?.recentActivities ?? [])
      : (fitnessPage.value?.recentActivities ?? []).slice(0, ACTIVITY_PREVIEW_COUNT),
  )
  const hasMoreActivities = computed(
    () => (fitnessPage.value?.recentActivities.length ?? 0) > ACTIVITY_PREVIEW_COUNT,
  )

  function activityHref(id: string) {
    return `/fitness/activities/${id}`
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null
    if (!el) return false
    return Boolean(
      el.closest(
        ['a', 'button', 'iframe', 'input', 'textarea', 'select',
          '[role="menu"]', '[role="menuitem"]', '[data-pc-section]'].join(','),
      ),
    )
  }

  function onRowClick(href: string, e: MouseEvent) {
    if (isInteractiveTarget(e.target)) return
    if (e.metaKey || e.ctrlKey) {
      window.open(href, '_blank')
      return
    }
    void navigateTo(href)
  }

  function onRowAuxClick(href: string, e: MouseEvent) {
    if (e.button !== 1) return
    if (isInteractiveTarget(e.target)) return
    e.preventDefault()
    window.open(href, '_blank')
  }

  // Weight log
  const showLogWeight = ref(false)
  const logWeightInput = ref('')
  const savingWeight = ref(false)

  // Goal
  const showSetGoal = ref(false)
  const goalTargetInput = ref('')
  const savingGoal = ref(false)
  const shareDialog = ref<ShareDialogState | null>(null)
  const shareDialogOpen = computed({
    get: () => shareDialog.value !== null,
    set: (v: boolean) => { if (!v) shareDialog.value = null },
  })
  const shareBody = ref('')
  const shareVisibility = ref<PostVisibility>('public')
  const sharingPost = ref(false)

  const { isVerified, isPremium } = useAuth()

  // Tier accent: orange for premium, blue for verified
  const accentRgb = computed(() => isPremium.value ? 'rgb(249,115,22)' : 'rgb(59,130,246)')
  const accentText = computed(() => isPremium.value ? 'text-amber-500 dark:text-amber-400' : 'text-blue-500 dark:text-blue-400')
  const accentBg = computed(() => isPremium.value ? 'bg-orange-500' : 'bg-blue-500')
  const accentRing = computed(() => isPremium.value ? 'focus:ring-orange-500' : 'focus:ring-blue-500')

  const allowedVisibilities = computed<PostVisibility[]>(() => [
    'public',
    ...(isVerified.value ? ['verifiedOnly' as PostVisibility] : []),
    ...(isPremium.value ? ['premiumOnly' as PostVisibility] : []),
  ])

  // ─── Sync ────────────────────────────────────────────────────────────────────

  const syncing = ref(false)
  const stravaCooldownRemaining = ref(0)
  let stravaCooldownInterval: ReturnType<typeof setInterval> | null = null

  const stravaConnection = computed(() =>
    fitnessPage.value?.connections.find((c) => c.provider === 'strava' && c.status === 'active'),
  )

  const MANUAL_SYNC_COOLDOWN_SEC = 5 * 60

  function manualSyncRemainingSeconds(lastManualSyncAt: string | null | undefined): number {
    if (!lastManualSyncAt) return 0
    const elapsed = Math.floor((Date.now() - new Date(lastManualSyncAt).getTime()) / 1000)
    return Math.max(0, MANUAL_SYNC_COOLDOWN_SEC - elapsed)
  }

  function formatCooldown(seconds: number): string {
    if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`
    return `${seconds}s`
  }

  function startStravaCooldown(seconds: number) {
    stravaCooldownRemaining.value = seconds
    if (stravaCooldownInterval) clearInterval(stravaCooldownInterval)
    stravaCooldownInterval = setInterval(() => {
      stravaCooldownRemaining.value = Math.max(0, stravaCooldownRemaining.value - 1)
      if (stravaCooldownRemaining.value === 0 && stravaCooldownInterval) {
        clearInterval(stravaCooldownInterval)
        stravaCooldownInterval = null
      }
    }, 1000)
  }

  function refreshStravaCooldown() {
    const remaining = manualSyncRemainingSeconds(stravaConnection.value?.lastManualSyncAt)
    if (remaining > 0) startStravaCooldown(remaining)
    else stravaCooldownRemaining.value = 0
  }

  const lastSyncedShort = computed(() => {
    const conns = fitnessPage.value?.connections ?? []
    const dates = conns.flatMap((c) => (c.lastSyncAt ? [new Date(c.lastSyncAt)] : []))
    if (dates.length === 0) return null
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())))
    const elapsed = (Date.now() - latest.getTime()) / 1000
    if (elapsed < 60) return 'just now'
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`
    return 'yesterday'
  })

  const connectionLine = computed(() => {
    const conns = fitnessPage.value?.connections ?? []
    const names = conns.map((c) => (c.provider === 'strava' ? 'Strava' : 'Apple Health'))
    const unique = [...new Set(names)]
    const synced = lastSyncedShort.value
    return synced ? `${unique.join(' · ')} · synced ${synced}` : unique.join(' · ')
  })

  const connectEmptyCopy = computed(() =>
    fitnessPage.value?.stravaEnabled
      ? 'Connect Strava or Apple Health to see your activity.'
      : 'Connect Apple Health to see your activity.',
  )

  async function syncStrava() {
    if (syncing.value || stravaCooldownRemaining.value > 0) return
    syncing.value = true
    try {
      await apiFetchData<unknown>('/fitness/sync', { method: 'POST', body: { provider: 'strava' } })
      await loadPage()
      startStravaCooldown(MANUAL_SYNC_COOLDOWN_SEC)
    } catch (e: unknown) {
      toast.pushError(e, 'Sync failed')
      const msg = String((e as { data?: { message?: string } })?.data?.message ?? (e as Error)?.message ?? '')
      const match = msg.match(/(\d+) more seconds/)
      if (match) startStravaCooldown(Number(match[1]))
    } finally {
      syncing.value = false
    }
  }

  async function loadPage() {
    loading.value = true
    loadError.value = null
    try {
      fitnessPage.value = await apiFetchData<FitnessPage>('/fitness/me')
      refreshStravaCooldown()
    } catch (e) {
      if (!fitnessPage.value) {
        loadError.value = getSafeUserErrorMessage(e, "Couldn't load your fitness data.")
      }
    } finally {
      loading.value = false
    }
  }

  onMounted(loadPage)
  onActivated(loadPage)
  onBeforeUnmount(() => {
    if (stravaCooldownInterval) clearInterval(stravaCooldownInterval)
  })

  return {
    apiFetchData,
    toast,
    fitnessPage,
    loading,
    loadError,
    showAllActivities,
    displayedActivities,
    hasMoreActivities,
    activityHref,
    onRowClick,
    onRowAuxClick,
    showLogWeight,
    logWeightInput,
    savingWeight,
    showSetGoal,
    goalTargetInput,
    savingGoal,
    shareDialog,
    shareDialogOpen,
    shareBody,
    shareVisibility,
    sharingPost,
    isVerified,
    isPremium,
    accentRgb,
    accentText,
    accentBg,
    accentRing,
    allowedVisibilities,
    syncing,
    stravaCooldownRemaining,
    stravaConnection,
    formatCooldown,
    connectionLine,
    connectEmptyCopy,
    syncStrava,
    loadPage,
  }
}

export type FitnessPageContext = ReturnType<typeof useFitnessPage>

export const FITNESS_PAGE_CONTEXT: InjectionKey<FitnessPageContext> = Symbol('fitness-page')

/** Section components of pages/fitness.vue read the shared context here. */
export function useFitnessPageContext(): FitnessPageContext {
  const ctx = inject(FITNESS_PAGE_CONTEXT)
  if (!ctx) throw new Error('useFitnessPageContext() must be used inside pages/fitness.vue')
  return ctx
}
