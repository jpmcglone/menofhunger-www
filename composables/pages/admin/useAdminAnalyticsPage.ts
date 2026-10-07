import { Chart, registerables } from 'chart.js'
import type { AdminAcquisition, AdminAnalytics, AdminReferralAnalytics, AnalyticsRange, AdminAnalyticsBrief } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { useAnalyticsCharts } from '../../admin/useAnalyticsCharts'
import { useAdminAnalyticsCards } from './useAdminAnalyticsCards'
import type { InjectionKey } from 'vue'

/**
 * Script state for `/admin/analytics`, shared with the analytics sections through
 * `useAdminAnalyticsContext()`.
 */
export function useAdminAnalyticsPage() {
  const state = useAdminAnalyticsState()
  const charts = useAnalyticsCharts(state.data, state.selectedRange)
  const actions = useAdminAnalyticsActions({ ...state, ...charts })
  const cards = useAdminAnalyticsCards({ ...state, ...actions })
  const ctx = { ...state, ...charts, ...actions, ...cards }
  provide(ADMIN_ANALYTICS_CONTEXT, ctx)
  return ctx
}

/**
 * Row navigation, the analytics/referral/acquisition/brief state, and the range selector.
 */
export function useAdminAnalyticsState() {
  Chart.register(...registerables)

  function onAnalyticsRowClick(href: string, e: MouseEvent) {
    if (e.metaKey || e.ctrlKey) {
      window.open(href, '_blank')
      return
    }
    void navigateTo(href)
  }

  function onAnalyticsRowAuxClick(href: string, e: MouseEvent) {
    if (e.button !== 1) return
    e.preventDefault()
    window.open(href, '_blank')
  }

  const { apiFetchData } = useApiClient()

  const data = ref<AdminAnalytics | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const referralAnalytics = ref<AdminReferralAnalytics | null>(null)
  const referralAnalyticsLoading = ref(false)
  const acquisition = ref<AdminAcquisition | null>(null)
  const brief = ref<string | null>(null)
  const briefLoading = ref(false)
  const briefError = ref<string | null>(null)

  // ─── Range selector ───────────────────────────────────────────────────────────

  const rangeOptions: { label: string; value: AnalyticsRange }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '3M', value: '3m' },
    { label: '1Y', value: '1y' },
    { label: 'All', value: 'all' },
  ]

  const selectedRange = ref<AnalyticsRange>('30d')

  const rangeLabel = computed(() => {
    const found = rangeOptions.find((o) => o.value === selectedRange.value)
    return found?.label ?? '30D'
  })

  return {
    onAnalyticsRowClick,
    onAnalyticsRowAuxClick,
    apiFetchData,
    data,
    loading,
    error,
    referralAnalytics,
    referralAnalyticsLoading,
    acquisition,
    brief,
    briefLoading,
    briefError,
    rangeOptions,
    selectedRange,
    rangeLabel,
  }
}

/**
 * Range changes, the Marv brief, and loading analytics, referrals, and acquisition.
 */
export function useAdminAnalyticsActions(ctx: ReturnType<typeof useAdminAnalyticsState> & ReturnType<typeof useAnalyticsCharts>) {
  const { apiFetchData, data, loading, error, referralAnalytics, referralAnalyticsLoading, acquisition, brief, briefLoading, briefError, selectedRange, renderCharts } = ctx

  function setRange(range: AnalyticsRange) {
    if (range === selectedRange.value) return
    selectedRange.value = range
    brief.value = null
    briefError.value = null
    load()
  }

  async function askMarv() {
    if (!data.value || briefLoading.value) return
    briefLoading.value = true
    briefError.value = null
    try {
      const result = await apiFetchData<AdminAnalyticsBrief>('/admin/analytics/brief', {
        method: 'POST',
        body: {
          range: selectedRange.value,
          analytics: data.value,
          referrals: referralAnalytics.value,
        },
      })
      brief.value = result.brief
    } catch (e: unknown) {
      brief.value = null
      briefError.value = getSafeUserErrorMessage(e, 'Marv could not read these numbers right now.')
    } finally {
      briefLoading.value = false
    }
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  async function load() {
    loading.value = true
    error.value = null
    try {
      data.value = await apiFetchData<AdminAnalytics>(`/admin/analytics?range=${selectedRange.value}`)
      await nextTick()
      renderCharts()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load analytics'
    } finally {
      loading.value = false
    }
    // Load referral analytics separately (always all-time; non-blocking).
    referralAnalyticsLoading.value = true
    try {
      referralAnalytics.value = await apiFetchData<AdminReferralAnalytics>('/admin/analytics/referrals')
    } catch {
      // non-critical
    } finally {
      referralAnalyticsLoading.value = false
    }
    try {
      acquisition.value = await apiFetchData<AdminAcquisition>('/admin/analytics/acquisition', { query: { days: 7 } })
    } catch {
      // non-critical
    }
  }

  return {
    setRange,
    askMarv,
    load,
  }
}

export type AdminAnalyticsPageContext = ReturnType<typeof useAdminAnalyticsPage>

export const ADMIN_ANALYTICS_CONTEXT: InjectionKey<AdminAnalyticsPageContext> = Symbol('admin-analytics')

/** Section components of pages/admin/analytics.vue read the shared context here. */
export function useAdminAnalyticsContext(): AdminAnalyticsPageContext {
  const ctx = inject(ADMIN_ANALYTICS_CONTEXT)
  if (!ctx) throw new Error('useAdminAnalyticsContext() must be used inside pages/admin/analytics.vue')
  return ctx
}
